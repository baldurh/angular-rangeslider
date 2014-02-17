/*
 *  Angular RangeSlider Directive
 * 
 *  Version: 0.0.6
 *
 *  Author: Daniel Crisp, danielcrisp.com
 *
 *  The rangeSlider has been styled to match the default styling
 *  of form elements styled using Twitter's Bootstrap
 * 
 *  Originally forked from https://github.com/leongersen/noUiSlider
 *

    This code is released under the MIT Licence - http://opensource.org/licenses/MIT

    Copyright (c) 2013 Daniel Crisp

    Permission is hereby granted, free of charge, to any person obtaining a copy
    of this software and associated documentation files (the "Software"), to deal
    in the Software without restriction, including without limitation the rights
    to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
    copies of the Software, and to permit persons to whom the Software is
    furnished to do so, subject to the following conditions:

    The above copyright notice and this permission notice shall be included in
    all copies or substantial portions of the Software.

    THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
    IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
    FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
    AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
    LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
    OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
    THE SOFTWARE.

*/

(function () {
    'use strict';

    /**
     * RangeSlider, allows user to define a range of values using a slider
     * Touch friendly.
     * @directive
     */
    angular.module('ui-rangeSlider', [])
        .directive('rangeSlider', function($document, $filter, $log) {

        // test for mouse, pointer or touch
        var EVENT = window.PointerEvent ? 1 : (window.MSPointerEvent ? 2 : ('ontouchend' in document ? 3 : 4)), // 1 = IE11, 2 = IE10, 3 = touch, 4 = mouse
            eventNamespace = '.rangeSlider',

            defaults = {
                disabled: false,
                orientation: 'horizontal',
                step: 0,
                decimalPlaces: 0,
                showValues: true,
                preventEqualMinMax: false
            },

            onEvent = (EVENT === 1 ? 'pointerdown' : (EVENT === 2 ? 'MSPointerDown' : (EVENT === 3 ? 'touchstart' : 'mousedown'))),
            moveEvent = (EVENT === 1 ? 'pointermove' : (EVENT === 2 ? 'MSPointerMove' : (EVENT === 3 ? 'touchmove' : 'mousemove'))),
            offEvent = (EVENT === 1 ? 'pointerup' : (EVENT === 2 ? 'MSPointerUp' : (EVENT === 3 ? 'touchend' : 'mouseup'))),

            // get standarised clientX and clientY
            client = function (f) {
                try {
                    return [(f.clientX || f.originalEvent.clientX || f.originalEvent.touches[0].clientX), (f.clientY || f.originalEvent.clientY || f.originalEvent.touches[0].clientY)];
                } catch (e) {
                    return ['x', 'y'];
                }
            },

            restrict = function (value, min, max) {

                // normalize so it can't move out of bounds
                return Math.max(min, Math.min(value, max)); //(value < 0 ? 0 : (value > runnerWidth ? 100 : value))

            },

            isNumber = function (n) {
               // console.log(n);
                return !isNaN(parseFloat(n)) && isFinite(n);
            };

        if (EVENT < 4) {
            // some sort of touch has been detected
            $document.find('html').addClass('ngrs-touch');
        } else {
            $document.find('html').addClass('ngrs-no-touch');
        }


        return {
            restrict: 'A',
            replace: true,
            template: ['<div class="ngrs-range-slider">',
                         '<runner class="ngrs-runner">',
                           '<handle class="ngrs-handle ngrs-handle-min" ng-mousedown="downHandler($event)" index="0"><i></i></handle>',
                           '<handle class="ngrs-handle ngrs-handle-max" ng-mousedown="downHandler($event)" index="1"><i></i></handle>',
                           '<join class="ngrs-join"></join>',
                         '</runner>',
                         '<div class="ngrs-value ngrs-value-min" ng-show="showValues">{{filteredModelMin}}</div>',
                         '<div class="ngrs-value ngrs-value-max" ng-show="showValues">{{filteredModelMax}}</div>',
                       '</div>'].join(''),
            scope: {
                disabled: '=?',
                min: '=',
                max: '=',
                modelMin: '=?',
                modelMax: '=?',
                orientation: '@', // options: horizontal | vertical | vertical left | vertical right
                step: '@',
                decimalPlaces: '@',
                filter: '@',
                filterOptions: '@',
                showValues: '@',
                pinHandle: '@',
                preventEqualMinMax: '@'
            },
            link: function(scope, element, attrs, controller) {

                /** 
                 *  FIND ELEMENTS
                 */

                var $slider = angular.element(element),
                    handles = element.find('handle'),
                    runner = element.find('runner'),
                    handle1pos = 0,
                    handle2pos = 0,
                    join = element.find('join'),
                    pos = 'left',
                    posOpp = 'right',
                    orientation = 0,
                    allowedRange = [0, 0],
                    range = scope.max - scope.min,
                    scheduledFrame = false,
                    body = $document.find('body'),
                    downHandle = null;

                var runnerWidth = runner[0].offsetWidth;
                // filtered
                scope.filteredModelMin = scope.modelMin;
                scope.filteredModelMax = scope.modelMax;
                scope.handle1pos = restrict(((scope.modelMin - scope.min) / range) * runnerWidth, 0, runnerWidth);
                scope.handle2pos = restrict(((scope.modelMax - scope.min) / range) * runnerWidth, 0, runnerWidth);
                /**
                 *  FALL BACK TO DEFAULTS FOR SOME ATTRIBUTES
                 */

                attrs.$observe('disabled', function (val) {
                    if (!angular.isDefined(val)) {
                        scope.disabled = defaults.disabled;
                    }

                    scope.$watch('disabled', setDisabledStatus);
                });

                attrs.$observe('orientation', function (val) {
                    if (!angular.isDefined(val)) {
                        scope.orientation = defaults.orientation;
                    }

                    var classNames = scope.orientation.split(' '),
                        useClass;

                    for (var i = 0, l = classNames.length; i < l; i++) {
                        classNames[i] = 'ngrs-' + classNames[i];
                    }

                    useClass = classNames.join(' ');

                    // add class to element
                    $slider.addClass(useClass);

                    // update pos
                    if (scope.orientation === 'vertical' || scope.orientation === 'vertical left' || scope.orientation === 'vertical right') {
                        pos = 'top';
                        posOpp = 'bottom';
                        orientation = 1;
                    }
                });

                attrs.$observe('step', function (val) {
                    if (!angular.isDefined(val)) {
                        scope.step = defaults.step;
                    }
                });

                attrs.$observe('decimalPlaces', function (val) {
                    if (!angular.isDefined(val)) {
                        scope.decimalPlaces = defaults.decimalPlaces;
                    }
                });

                attrs.$observe('showValues', function (val) {
                    if (!angular.isDefined(val)) {
                        scope.showValues = defaults.showValues;
                    } else {
                        if (val === 'false') {
                            scope.showValues = false;
                        } else {
                            scope.showValues = true;
                        }
                    }
                });

                attrs.$observe('pinHandle', function (val) {
                    if (!angular.isDefined(val)) {
                        scope.pinHandle = null;
                    } else {
                        if (val === 'min' || val === 'max') {
                            scope.pinHandle = val;
                        } else {
                            scope.pinHandle = null;
                        }
                    }

                    scope.$watch('pinHandle', setPinHandle);
                });

                attrs.$observe('preventEqualMinMax', function (val) {
                    if (!angular.isDefined(val)) {
                        scope.preventEqualMinMax = defaults.preventEqualMinMax;
                    } else {
                        if (val === 'false') {
                            scope.preventEqualMinMax = false;
                        } else {
                            scope.preventEqualMinMax = true;
                        }
                    }
                });

                if (scope.min > scope.max) {
                    throwError('min must be less than or equal to max');
                }

                if (scope.modelMin > scope.modelMax) {
                    throwWarning('modelMin must be less than or equal to modelMax');
                    // reset values to correct
                    scope.modelMin = scope.modelMax;
                }

                // only do stuff when all values are ready
                if ( angular.isDefined(scope.min) &&
                     angular.isDefined(scope.max) &&
                    (angular.isDefined(scope.modelMin) || scope.pinHandle === 'min') && 
                    (angular.isDefined(scope.modelMax) || scope.pinHandle === 'max')
                ) {
                    // make sure they are numbers
                    if (!isNumber(scope.min)) {
                        throwError('min must be a number');
                    }

                    if (!isNumber(scope.max)) {
                        throwError('max must be a number');
                    }

                    // make sure they are numbers
                    if (!isNumber(scope.modelMin)) {
                        if (scope.pinHandle !== 'min') {
                            throwWarning('modelMin must be a number');
                        }
                        scope.modelMin = scope.min;
                    }

                    if (!isNumber(scope.modelMax)) {
                        if (scope.pinHandle !== 'max') {
                            throwWarning('modelMax must be a number');
                        }
                        scope.modelMax = scope.max;
                    }

                    range = scope.max - scope.min;
                    allowedRange = [scope.min, scope.max];

                    // listen for changes to values
                    scope.$watch('handle1pos', setModelMinMax);
                    scope.$watch('handle2pos', setModelMinMax);
                }

                /**
                 * HANDLE CHANGES
                 */
                
                function setPinHandle (status) {
                    if (status === "min") {
                        handles.eq(0).css('display', 'none');
                        handles.eq(1).css('display', 'block');
                    } else if (status === "max") {
                        handles.eq(0).css('display', 'block');
                        handles.eq(1).css('display', 'none');
                    } else {
                        handles.eq(0).css('display', 'block');
                        handles.eq(1).css('display', 'block');
                    }
                }

                function setDisabledStatus (status) {
                    if (status) {
                        $slider.addClass('disabled');
                    } else {
                        $slider.removeClass('disabled');
                    }
                }

                function setModelMinMax () {

                    // skip the calculations if there is a frame scheduled to be drawn
                    if (scheduledFrame) {
                        return;
                    }

                    scheduledFrame = true;



                    scope.modelMin = parseFloat(scope.handle1pos / runnerWidth * range).toFixed(scope.decimalPlaces);
                    scope.modelMax = parseFloat(scope.handle2pos / runnerWidth * range).toFixed(scope.decimalPlaces);

                    // make sure the model values are within the allowed range
                    scope.modelMin = Math.max(scope.min, scope.modelMin);
                    scope.modelMax = Math.min(scope.max, scope.modelMax);

                    if (scope.filter) {
                        scope.filteredModelMin = $filter(scope.filter)(scope.modelMin, scope.filterOptions);
                        scope.filteredModelMax = $filter(scope.filter)(scope.modelMax, scope.filterOptions);
                    } else {
                        scope.filteredModelMin = scope.modelMin;
                        scope.filteredModelMax = scope.modelMax;
                    }

                    requestAnimFrame(updateUI);
                    

                }

                function updateUI() {

                    // check for no range
                    if (scope.min === scope.max && scope.modelMin === scope.modelMax) {

                        // reposition handles
                        handles.eq(0).css(pos, '0%');
                        handles.eq(1).css(pos, '100%');

                        // reposition join
                        join.css(pos, '0%').css(posOpp, '0%');

                    } else {

                        // reposition handles
                        handles.eq(0).css('-webkit-transform', 'translate3d('+scope.handle1pos+'px,0,0)');
                        handles.eq(1).css('-webkit-transform', 'translate3d('+scope.handle2pos+'px,0,0)');

                        // reposition join
                        // join.css(pos, handle1pos + '%').css(posOpp, (100 - handle2pos) + '%');
                        join.css('-webkit-transform', 'translate3d('+scope.handle1pos+'px,0,0)').css('width', scope.handle2pos-scope.handle1pos+'px');
                        // ensure min handle can't be hidden behind max handle
                        if (scope.handle1pos >  95) {
                            handles.eq(0).css('z-index', 3);
                        }
                    }

                    scheduledFrame = false;
                }


                scope.downHandler = function(event) {
                    
                    downHandle = angular.element(event.currentTarget);
                    var index = parseInt(downHandle.attr('index')),
                        isMin = index === 0;

                    var handleDownClass = (isMin ? 'ngrs-handle-min' : 'ngrs-handle-max') + '-down',
                        modelValue = (isMin ? scope.modelMin : scope.modelMax) - scope.min,
                        originalPosition = (modelValue / range) * runnerWidth,
                        originalClick = client(event),
                        previousClick = originalClick,
                        previousProposal = false;

                    // only do stuff if we are not disabled
                    if (!scope.disabled) {

                        // add down class
                        downHandle.addClass('ngrs-down');

                        $slider.addClass('ngrs-focus ' + handleDownClass);

                        // add touch class for MS styling
                        body.addClass('ngrs-touching');

                        $document[0].addEventListener(moveEvent, moveHandler);
                        $document[0].addEventListener(offEvent, upHandler);
                        // stop user accidentally selecting stuff
                        $document[0].addEventListener('selectstart', false);
                    }

                    function upHandler(e) {
                        $document[0].removeEventListener(moveEvent, moveHandler);
                        $document[0].removeEventListener(offEvent, upHandler);
                        $document[0].removeEventListener('selectstart', false);

                        body.removeClass('ngrs-touching');

                        // remove down class
                        downHandle.removeClass('ngrs-down');

                        // remove active class
                        $slider.removeClass('ngrs-focus ' + handleDownClass);
                    }
                    function moveHandler (e) {
                        // prevent default
                        e.preventDefault();
                        

                        var currentClick = client(e),
                            movement,
                            proposal,
                            other,
                            per = (scope.step / range) * 100,
                            otherModelPosition = isMin ? scope.handle2pos : scope.handle1pos;

                        if (currentClick[0] === "x") {
                            return;
                        }

                        // calculate deltas
                        currentClick[0] -= originalClick[0];
                        currentClick[1] -= originalClick[1];

                        // has movement occurred on either axis?
                        movement = [
                            (previousClick[0] !== currentClick[0]), (previousClick[1] !== currentClick[1])
                        ];

                        // propose a movement
                        proposal = originalPosition + currentClick[orientation];

                        // normalize so it can't move out of bounds
                        proposal = restrict(proposal, 0, runnerWidth);

                        if (scope.preventEqualMinMax) {

                            if (per === 0) {
                                per = (1 / range) * 100; // restrict to 1
                            }

                            if (isMin) {
                                otherModelPosition = otherModelPosition - per;
                            } else {
                                otherModelPosition = otherModelPosition + per;
                            }
                        }

                        // check which handle is being moved and add / remove margin
                        if (isMin) {
                            proposal = proposal > otherModelPosition ? otherModelPosition : proposal;
                        } else {
                            proposal = proposal < otherModelPosition ? otherModelPosition : proposal;
                        }

                        if (scope.step > 0) {
                            // only change if we are within the extremes, otherwise we get strange rounding
                            if (proposal < 100 && proposal > 0) {
                                proposal = Math.round(proposal / per) * per;
                            }
                        }

                        if (proposal > 95 && isMin) {
                            downHandle.css('z-index', 3);
                        } else {
                            downHandle.css('z-index', '');
                        }

                        if (movement[orientation] && proposal != previousProposal) {
                            scope.$apply(function () {
                                if (isMin) {
                                    // update model as we slide
                                    scope.handle1pos = proposal;
                                } else {
                                    // update model as we slide
                                    scope.handle2pos = proposal;
                                } 
                            });
                        }

                        previousProposal = proposal;
                        previousClick = currentClick;
                    }
                }
                

                function throwError (message) {
                    scope.disabled = true;
                    throw new Error("RangeSlider: " + message);
                }

                function throwWarning (message) {
                    $log.warn(message);
                }

                /**
                 * DESTROY
                 */

                scope.$on('$destroy', function () {

                    // unbind event from slider
                    $slider.off(eventNamespace);

                    // unbind from body
                    body.off(eventNamespace);

                    // unbind from document
                    $document.off(eventNamespace);

                    // unbind from handles
                    for (var i = 0, l = handles.length; i < l; i++) {
                        handles[i].off(eventNamespace);
                        handles[i].off(eventNamespace + 'X');
                    }

                });

                /**
                 * INIT
                 */

                // disable selection
                $slider[0].addEventListener('selectstart', false);
                // stop propagation
                $slider[0].addEventListener('click', function (event) {
                    event.stopPropagation();
                });

            }
        };
    });
    
    // requestAnimationFramePolyFill
    // http://www.paulirish.com/2011/requestanimationframe-for-smart-animating/
    // shim layer with setTimeout fallback
    window.requestAnimFrame = (function(){
      return  window.requestAnimationFrame       ||
          window.webkitRequestAnimationFrame ||
          window.mozRequestAnimationFrame    ||
          function( callback ){
            window.setTimeout(callback, 1000 / 60);
          };
    })();
}());

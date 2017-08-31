(function() {
  'use strict';

  angular
  .module('PDIAP')
  .directive('mdBlur', function($timeout) {
    var directive = {
      restrict: 'A',
      link: function(scope, element, attributes){
        $timeout(function(){
          angular.element(element[0].querySelector("input.md-input")).bind("blur", function(){
            $timeout(function() {
              scope.$eval(attributes.mdBlur);
            }, 100);
          });
        },0);
      }
    };
    return directive;
  })
  .directive('mdFocus', function($timeout) {
    var directive = {
      restrict: 'A',
      link: function(scope, element, attributes){
        $timeout(function(){
          angular.element(element[0].querySelector("input.md-input")).bind("focus", function(){
            $timeout(function() {
              scope.$eval(attributes.mdFocus);
            }, 100);
          });
        },0);
      }
    };
    return directive;
  });

})();

(function(){
  'use strict';

  angular
  .module('PDIAP')
  .directive('passwordVerify', [function () {
    return {
      require: 'ngModel',
      link: function (scope, elem, attrs, model) {
        if (!attrs.passwordVerify) {
          console.error('passwordVerify expects a model as an argument!');
          return;
        }
        scope.$watch(attrs.passwordVerify, function (value) {
          // Only compare values if the second ctrl has a value.
          if (model.$viewValue !== undefined && model.$viewValue !== '') {
            model.$setValidity('passwordVerify', value === model.$viewValue);
          }
        });
        model.$parsers.push(function (value) {
          // Mute the nxEqual error if the second ctrl is empty.
          if (value === undefined || value === '') {
            model.$setValidity('passwordVerify', true);
            return value;
          }
          var isValid = value === scope.$eval(attrs.passwordVerify);
          model.$setValidity('passwordVerify', isValid);
          return isValid ? value : undefined;
        });
      }
    };
  }]);

})();

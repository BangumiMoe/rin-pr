'use strict';

function JobActions(start, succeed, failed, reset) {
  this.fn_start = start;
  this.fn_succeed = succeed;
  this.fn_failed = failed;
  this.fn_reset = reset;
};

JobActions.prototype.start = function () {
  //this.reset();
  if (this.fn_start) {
    return this.fn_start();
  }
};

JobActions.prototype.succeed = function () {
  if (this.fn_succeed) {
    return this.fn_succeed();
  }
};

JobActions.prototype.fail = function (err) {
  if (this.fn_failed) {
    return this.fn_failed(err);
  }
};

JobActions.prototype.reset = function () {
  if (this.fn_reset) {
    return this.fn_reset();
  }
};

function JobActionsWrapper($scope, ngProgress) {

  var _ja = new JobActions(function () {
    //start
    $scope.working = true;
    ngProgress.start();
  }, function () {
    //succeed
    $scope.working = false;
    ngProgress.complete();
  }, function (err) {
    //fail
    $scope.working = false;
    $scope.jobFailed = true;
    $scope.message = err;
    ngProgress.complete();
  }, function () {
    //reset
    if ($scope.working) {
      return false;
    }
    $scope.message = '';
    $scope.jobFailed = false;
    return true;
  });

  $scope.working = false;

  return _ja;
}

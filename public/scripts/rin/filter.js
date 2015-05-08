
rin
.filter('to_trusted', ['$sce', function ($sce) {
    return function (text) {
        return $sce.trustAsHtml(text);
    };
}])
.filter('tagname', ['$rootScope', function ($rootScope) {
    return function (tag) {
        if (!tag) {
            return '';
        }
        var lang = $rootScope.lang;
        if (tag.locale && tag.locale[lang]) {
            return tag.locale[lang];
        } else {
            return tag.name;
        }
    };
}]);

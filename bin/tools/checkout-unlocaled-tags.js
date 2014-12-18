var f = function(tags) {
    tags.forEach(function(t) {
        if (!t.locale && t.type === 'bangumi') {
            console.log(t.name);
        }
    });
};

function ASCarr(results) {
    var buf = results
    buf.sort(function (a, b) {
        return a.price - b.price;
    });
    return buf;
}

function DESCarr(results) {
    var buf = results
    buf.sort(function (b, a) {
        return a.price - b.price;
    });
    return buf;
}

module.exports = {
    ASCarr,
    DESCarr
};

export function html(...args: [string | TemplateStringsArray]) {
    return args
}

Array.prototype.random = function () {
    return this[Math.floor(Math.random() * this.length)];
};


function hashCode(str: string) {
    let hash = 0;
    for (var i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return hash;
}
export function randomPASTEL(str: string) {
    return `hsla(${~(hashCode(str) % 360)}, 70%,70%,0.8)`;
}

export function secondsToFriendlyTime(seconds: number) {
    seconds = Number(seconds);
    var d = Math.floor(seconds / (3600 * 24));
    var h = Math.floor(seconds % (3600 * 24) / 3600);
    var m = Math.floor(seconds % 3600 / 60);

    let display = [];
    if (d > 0) display.push(d + ' d')
    if (h > 0) display.push(h + ' h')
    if (m > 0) display.push(m + ' m')

    return display.join(', ');
}

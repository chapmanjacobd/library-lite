export function html(...args: [string | TemplateStringsArray]) {
    return args
}

Array.prototype.random = function () {
    return this[Math.floor(Math.random() * this.length)];
};

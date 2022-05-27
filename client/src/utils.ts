
export function obj2schema(obj: object | [], table: string, result = {}) {
    if (obj) {
        if (Array.isArray(obj)) return obj2schema(obj[0], table)

        result[table] = Object.keys(obj).map(k => {
            const v = obj[k];

            if (Array.isArray(v)) obj2schema(v[0], k, result)
            if (typeof v === 'object') return;
            return `${k} ${typeof v}`;
        }).filter(Boolean);

        return result
    }
}

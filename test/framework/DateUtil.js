import moment from "moment";

export function firstOfNextMonth() {
    return moment().add(1, 'M').startOf('month').toDate();
}

export function afterMonths(numberOfMonths) {
    return moment().add(numberOfMonths, 'M').startOf('month').toDate()
}

export function today() {
    return moment().toDate();
}

export function age({years = 0, months = 0, days = 0}) {
    return {years, months, days};
}

export function dateAreEqual(a, b) {
    expect(a.getDate()).toBe(b.getDate());
    expect(a.getMonth()).toBe(b.getMonth());
    expect(a.getFullYear()).toBe(b.getFullYear());
}

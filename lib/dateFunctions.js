module.exports = {
    startOfWeek: function (date){
        let d = new Date(date);
        let day = d.getDay();
        let diff = d.getDate() - day + (day == 0 ? -6:1); // adjust when day is sunday
            d.setDate(diff)
            d.setHours(0)
            d.setMinutes(0)
            d.setSeconds(0)
            d.setMilliseconds(0)
        return new Date(d);
    },
    startOfMonth: function (date){
        date = new Date(date);
        return new Date(date.getFullYear(), date.getMonth(), 1);
    }
}
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
    },
    event_christmas_2025_Start: function(){
        // December 19, 2025, 16:00:00
        return new Date(2025, 11, 19, 16, 0, 0, 0);
    },
    event_christmas_2025_End: function(){
        // January 4, 2026, 00:00:00
        return new Date(2026, 0, 4, 0, 0, 0, 0);
    }
}

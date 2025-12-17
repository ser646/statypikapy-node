const uri = "/api";

$("#logs_list").flowtype({
  minFont: 13,
  maxFont: 16,
});

$("#scoreboard").flowtype({
  minFont: 13,
  maxFont: 16,
});
$("#chart_buttons").flowtype({
  minFont: 13,
  maxFont: 16,
});

var log = {
  props: ["lkey"],
  template: "#log",
  data: function () {
    return {
      show_details: false,
      log_details: {
        Red: {},
        Blu: {},
      },
      loaded: false,
    };
  },
  methods: {
    toggle() {
      this.show_details = !this.show_details;
      const matchid = this.$props.lkey._id;

      if (this.show_details && !this.loaded) {
        app.getLog(matchid).then((r) => {
          Red = [];
          Blu = [];
          for (p in r.players) {
            if (r.players[p].team == "Red") {
              a = [];
              for (c of r.players[p].class_stats) {
                a.push(c.type);
              }
              Red.push({
                name: r.names[p],
                classes: a,
                kills: r.players[p].kills,
                assists: r.players[p].assists,
                deaths: r.players[p].deaths,
                dpm: r.players[p].dapm,
              });
            } else if (r.players[p].team == "Blue") {
              a = [];
              for (c of r.players[p].class_stats) {
                a.push(c.type);
              }
              Blu.push({
                name: r.names[p],
                classes: a,
                kills: r.players[p].kills,
                assists: r.players[p].assists,
                deaths: r.players[p].deaths,
                dpm: r.players[p].dapm,
              });
            }
          }
          Red.sort(function (a, b) {
            return b.kills - a.kills;
          });
          Blu.sort(function (a, b) {
            return b.kills - a.kills;
          });

          this.log_details.Red = Red;
          this.log_details.Blu = Blu;
          this.loaded = true;
        });
      }
    },
  },
};

const store = new Vuex.Store({
  state: {
    updating: true,
    logs_time_range: "monthly", //weekly, monthly, all
  },
  mutations: {
    updateLogsTimeRange(state, value) {
      state.logs_time_range = value;
    },
  },
});

var hof_card = {
  props: ["title", "param", "filterClass"],
  template: "#hof_card",
  store,
  data: function () {
    return {
      expand_players_list: false,
      filter_class: this.filterClass || false,
      filter_maps: [],
      test: store.state.updating,
      loading: false,
    };
  },
  methods: {},
  asyncComputed: {
    players: function () {
      if (!store.state.updating) {
        this.loading = true;
        return axios
          .get(uri + "/hof", {
            params: {
              time_range: store.state.logs_time_range,
              param: this.param,
              filter_class: this.filter_class,
              filter_maps: JSON.stringify(this.filter_maps),
            },
          })
          .then((r) => {
            d = r.data;
            if (d.length == 0) d = false;
            this.loading = false;
            return d;
          });
      } else return false;
    },
  },
};

var app = new Vue({
  el: "#app",
  store,
  vuetify: new Vuetify(),
  components: {
    log: log,
    "hof-card": hof_card,
    apexchart: VueApexCharts,
  },
  data: {
    active_panel: "score", //logs, score
    logs_to_show: [],
    logs_to_download: [],
    logs_to_download_total: 0,
    logs_last_sort: false,
    scores_last_sort: false,
    loading: true,
    fully_loaded: false,
    selected_player: false,
    filter_by_map: "",
    filter_by_class: "",
    chart_filter_class: "all",
    chart_data_label: "Kills",
    chart_data_limit: 100,
    chart_data: {
      Kills: [],
      Dpm: [],
      Damage: [],
    },
    chart_series: [
      {
        name: "",
        data: [],
      },
    ],
    chart_options: {
      chart: {
        type: "line",
        toolbar: {
          tools: {
            download: false,
            customIcons: [
              {
                icon: "<div>All</div>",
                title: "Show all logs",
                class: "chart-custom-icon",
                click: function (chart, options, e) {
                  app.chart_data_limit = 0;
                },
              },
              {
                icon: "<div>50</div>",
                title: "Show last 50 logs",
                class: "chart-custom-icon",
                click: function (chart, options, e) {
                  app.chart_data_limit = 50;
                },
              },
              {
                icon: "<div>100</div>",
                title: "Show last 100 logs",
                class: "chart-custom-icon",
                click: function (chart, options, e) {
                  app.chart_data_limit = 100;
                },
              },
            ],
          },
        },
      },
      noData: {
        text: "No data",
        style: {
          fontFamily: "Roboto,sans-serif;",
        },
      },
      xaxis: {
        labels: {
          show: false,
        },
        axisTicks: {
          show: false,
        },
        tooltip: {
          enabled: false,
        },
        tickAmount: 100,
      },
      dataLabels: {
        enabled: false,
      },
      markers: {
        size: 3,
      },
      fill: {
        opacity: 0,
        type: "solid",
      },
      tooltip: {
        x: {
          show: false,
        },
      },
      stroke: {
        show: true,
        curve: "straight",
        width: 2,
      },
    },
    downloaded: {
      weekly: {
        scores: false,
        logs: false,
        player_logs: {},
      },
      monthly: {
        scores: false,
        logs: false,
        player_logs: {},
      },
      all: {
        scores: false,
        logs: false,
        player_logs: {},
      },
      event_christmas_2025: {
        scores: false,
        logs: false,
        player_logs: {},
      },
    },
    small_vw: false,
  },
  computed: {
    logs_time_range: {
      get() {
        return this.$store.state.logs_time_range;
      },
      set(value) {
        this.$store.commit("updateLogsTimeRange", value);
      },
    },
  },
  methods: {
    change_chart_data: function (str) {
      let limit = Number(app.chart_data_limit);

      let d;
      d = app.chart_data[app.chart_filter_class][str];
      if (limit) d = d.slice(0, limit);
      d.reverse();
      let avg = 0;
      for (e of d) {
        avg += e;
      }
      avg = (avg / d.length).toFixed(0);
      $("#chart_avg").text(`Average: ${avg}`);
      app.chart_series = [
        {
          name: str,
          data: d,
        },
      ];
    },
    update: async function () {
      fetch(uri + "/logs/diff")
        .then((r) => r.json())
        .then((r) => {
          app.logs_to_download = r;
          const len = r.length;
          app.logs_to_download_total = r.length;
          if (r.length > 0) {
            let i = 0;
            let interval = setInterval(function () {
              if (i >= len) clearInterval(interval);
              else {
                app.downloadLog(r[0]);
                app.logs_to_download.shift();
                i++;
              }
            }, 250);
          } else {
            app.main();
            document.getElementById("update_info").innerText =
              "All logs up to date!";
            console.log("All logs up to date!");
            app.fully_loaded = true;
          }
        });
    },
    changeTimeRange: function (event) {
      store.state.logs_time_range = event.target.attributes.value.value;
    },
    downloadLog: function (matchid) {
      fetch(uri + "/logs?id=" + matchid, { method: "POST" })
        .then((r) => r.json())
        .then((r) => {
          if (r.status == "Success") {
            console.log(
              app.logs_to_download.length + ":" + matchid + " " + r.status,
            );
            document.getElementById("update_info").innerText =
              "Logs to download: " + app.logs_to_download.length;
            if (app.logs_to_download.length == 0) {
              app.main();
            }
          } else {
            app.logs_to_download.push(matchid);
            document.getElementById("update_info").innerText =
              "Logs to download: " + app.logs_to_download.length;
            console.log(r);
          }
        });
    },
    getLog: function (matchid) {
      this.loading = true;
      return fetch(uri + "/logs/" + matchid)
        .then((r) => r.json())
        .then((r) => {
          this.loading = false;
          return r;
        });
    },
    main: function () {
      document.getElementById("update_info").style = "display: none";
      store.state.updating = false;
      app.loading = false;
    },
    checkVW: function () {
      const vw = Math.max(
        document.documentElement.clientWidth || 0,
        window.innerWidth || 0,
      );
      if (vw < 1080) this.small_vw = true;
      else this.small_vw = false;
    },
    selectPlayer: function (p_id) {
      this.checkVW();
      app.selected_player == p_id
        ? (app.selected_player = false)
        : (app.selected_player = p_id);
      app.filter_by_class = "";
      app.filter_by_map = "";
      if (document.getElementById("player_logs_head")) {
        a = document
          .getElementById("player_logs_head")
          .getElementsByClassName("underlined");
        if (a.length > 0) a[0].classList.remove("underlined");
      }
    },
    sortLogs: function (param) {
      a = document
        .getElementById("player_logs_head")
        .getElementsByClassName("underlined");
      if (a.length > 0) a[0].classList.remove("underlined");
      event.target.classList.add("underlined");
      if (param == app.logs_last_sort) {
        app.player_logs.reverse();
      } else
        this.player_logs.sort(function (a, b) {
          return b.stats[param] - a.stats[param];
        });
      app.logs_last_sort = param;
    },
    sortScores: function (param) {
      if (event.target.type != "button") {
        a = document
          .getElementById("score_head")
          .getElementsByClassName("underlined");
        if (a.length > 0) a[0].classList.remove("underlined");
        event.target.classList.add("underlined");
        if (param == app.scores_last_sort) {
          app.scores.reverse();
        } else
          this.scores.sort(function (a, b) {
            return b[1][param] - a[1][param];
          });
        app.scores_last_sort = param;
        if (app.selected_player)
          setTimeout(function () {
            document
              .querySelectorAll(`[data-sid*="${app.selected_player}"]`)[0]
              .scrollIntoView({
                behavior: "smooth",
                block: "center",
              });
          }, 100);
      } else {
        if (event.target.classList[0] == "underlined") {
          event.target.classList.remove("underlined");
          for (p of app.scores) {
            p[1].score -= p[1].games_tied;
          }
        } else {
          event.target.classList.add("underlined");
          for (p of app.scores) {
            p[1].score += p[1].games_tied;
          }
        }
        if (app.scores_last_sort == "score")
          this.scores.sort(function (a, b) {
            return b[1][param] - a[1][param];
          });
      }
    },
    showScoreboard: function () {
      if (this.active_panel == "score" && this.scores) {
        if (this.selected_player) {
          if (!this.small_vw) return true;
          else return false;
        } else return true;
      } else return false;
    },
    setRouteFromURL: function () {
      hash = window.location.hash.split("/");
      if (window.location.hash.length > 0) {
        this.logs_time_range = hash[1];
        this.active_panel = hash[2];
        this.selected_player = hash[3];
      } else {
        window.location.hash = `/${store.state.logs_time_range}/${this.active_panel}`;
      }
    },
    resizeMain: function () {
      el_main = document.getElementsByTagName("main")[0];
      panels = document.getElementsByClassName("panel");
      if (this.selected_player && this.active_panel == "score") {
        el_main.style.marginTop = "50px";
        for (el of panels) {
          el.style.height = "calc(100vh - 50px)";
        }
      } else {
        el_main.style.marginTop = "0px";
        for (el of panels) {
          el.style.height = "calc(100vh - 0px)";
        }
      }
    },
  },
  asyncComputed: {
    logs: function () {
      if (!store.state.updating) {
        if (this.active_panel == "logs") {
          if (!this.downloaded[store.state.logs_time_range].logs) {
            this.loading = true;
            return fetch(uri + "/logs/" + store.state.logs_time_range)
              .then((r) => r.json())
              .then((r) => {
                for (log of r) {
                  const d = new Date(log.date * 1000);
                  options = {
                    year: "numeric",
                    month: "numeric",
                    day: "numeric",
                    hour: "numeric",
                    minute: "numeric",
                    hour12: false,
                    timeZone: "Europe/Berlin",
                  };
                  log.date = new Intl.DateTimeFormat("pl", options).format(d);
                }
                this.loading = false;
                if (r.length == 0) r = false;
                this.downloaded[store.state.logs_time_range].logs = r;
                return r;
              });
          } else return this.downloaded[store.state.logs_time_range].logs;
        }
      }
    },
    scores: function () {
      if (!store.state.updating) {
        if (this.active_panel == "score") {
          if (!this.downloaded[store.state.logs_time_range].scores) {
            this.loading = true;
            return fetch(uri + "/scores/" + store.state.logs_time_range)
              .then((r) => r.json())
              .then((r) => {
                for (p_id in r) {
                  r[p_id].score =
                    r[p_id].games_won * 2 -
                    r[p_id].games_lost * 2 +
                    r[p_id].games_tied;
                }
                r = sortObject(r, "score");
                app.scores_last_sort = "score";
                $("#score_head div:last-child")[0].classList.add("underlined");
                $("#score_head div:last-child input")[0].classList.add(
                  "underlined",
                );
                this.loading = false;
                if (r.length == 0) r = false;
                this.downloaded[store.state.logs_time_range].scores = r;

                return r;
              });
          } else return this.downloaded[store.state.logs_time_range].scores;
        }
      }
    },
    player_logs: function () {
      if (this.selected_player) {
        //if(!this.downloaded[store.state.logs_time_range].player_logs[this.selected_player]){
        this.loading = true;

        //chart stuff
        app.chart_series = [];
        //chart stuff

        $("#avatar").hide();
        fetch(uri + "/profile/steam/" + this.selected_player)
          .then((r) => r.json())
          .then((r) => {
            imageUrl = r[0].avatar;
            imageUrl = imageUrl.slice(0, -4) + "_full" + imageUrl.slice(-4);
            $("#avatar").css("background-image", "url(" + imageUrl + ")");
            $("#avatar").attr("title", "Open steam profile");
            $("#avatar").off("click").on("click", function () {
              window.open(r[0].profileurl, "_blank");
            });
            $("#avatar").show();
          });

        fetch(
          uri +
            "/profile/pr/" +
            this.selected_player +
            "?time_range=" +
            store.state.logs_time_range,
        )
          .then((r) => r.json())
          .then((r) => {
            let prs = $(".pr");
            prs[0].innerText = r.maxKills;
            prs[1].innerText = r.maxDmg;
            prs[2].innerText = r.maxDpm;
            prs[3].innerText = r.maxKpd;
          });

        return fetch(
          uri +
            "/player_logs/" +
            this.selected_player +
            "?time_range=" +
            store.state.logs_time_range,
        )
          .then((r) => r.json())
          .then((r) => {
            this.logs_last_sort = false;
            this.loading = false;
            if (r.length == 0) r = false;
            this.downloaded[store.state.logs_time_range].player_logs[
              this.selected_player
            ] = r;
            app.logs_last_sort = "date";

            //chart stuff
            app.chart_data = {
              all: {
                Kills: [],
                Dpm: [],
                Damage: [],
              },
              scout: {
                Kills: [],
                Dpm: [],
                Damage: [],
              },
              soldier: {
                Kills: [],
                Dpm: [],
                Damage: [],
              },
              demoman: {
                Kills: [],
                Dpm: [],
                Damage: [],
              },
              medic: {
                Kills: [],
                Dpm: [],
                Damage: [],
              },
              sniper: {
                Kills: [],
                Dpm: [],
                Damage: [],
              },
              pyro: {
                Kills: [],
                Dpm: [],
                Damage: [],
              },
              engineer: {
                Kills: [],
                Dpm: [],
                Damage: [],
              },
              spy: {
                Kills: [],
                Dpm: [],
                Damage: [],
              },
              heavy: {
                Kills: [],
                Dpm: [],
                Damage: [],
              },
            };
            for (log of r) {
              let d = app.chart_data["all"];
              d.Kills.push(log.stats.kills);
              d.Dpm.push(log.stats.dapm);
              d.Damage.push(log.stats.dmg);

              if (app.chart_data[log.classes[0]]) {
                d = app.chart_data[log.classes[0]];
                d.Kills.push(log.stats.kills);
                d.Dpm.push(log.stats.dapm);
                d.Damage.push(log.stats.dmg);
              }
            }

            if ($("#chart_buttons :input:checked")[0])
              this.change_chart_data(
                $("#chart_buttons :input:checked")[0].value,
              );
            else {
              $("#chart_buttons :input").eq(0).prop("checked", true);
              this.change_chart_data(
                $("#chart_buttons :input:checked")[0].value,
              );
            }
            //chart stuff

            return r;
          });

        //}
        //else return this.downloaded[store.state.logs_time_range].player_logs[this.selected_player]
      }
    },
    filtered_player_logs: function () {
      if (this.player_logs) {
        fl = app.player_logs;
        if (app.filter_by_class != "") {
          fl = fl.filter((log) => {
            for (c of log.classes) {
              if (c == app.filter_by_class) return true;
            }
          });
        }
        if (app.filter_by_map != "") {
          fl = fl.filter((log) => {
            if (log.map.includes(app.filter_by_map)) return true;
          });
        }
        return fl;
      }
    },
  },
  filters: {
    sliceFirstAndLast: function (value) {
      if (!value) return "";
      else return value.slice(1, -1);
    },
  },
  watch: {
    logs_time_range: function (str) {
      hash = window.location.hash.split("/");
      hash[0] = "#";
      hash[1] = str;
      window.location.hash = hash.join("/");
    },
    active_panel: function (str) {},
    chart_data_label: function (str) {
      this.change_chart_data(str);
    },
    chart_data_limit: function (str) {
      this.change_chart_data($("#chart_buttons :input:checked")[0].value);
    },
    chart_filter_class: function () {
      this.change_chart_data($("#chart_buttons :input:checked")[0].value);
    },
    filter_by_class: function () {
      app.chart_filter_class =
        app.filter_by_class != "" ? app.filter_by_class : "all";
    },
    selected_player: function (str) {
      hash = window.location.hash.split("/");
      hash[0] = "#";
      if (str) hash[3] = str;
      else hash[3] = "";
      window.location.hash = hash.join("/");
      this.resizeMain();
    },
    active_panel: {
      handler: function (str) {
        hash = window.location.hash.split("/");
        hash[0] = "#";
        hash[2] = str;
        if (str == "logs" || str == "hof") hash[3] = "";
        else if (str == "score" && this.selected_player)
          hash[3] = this.selected_player;
        window.location.hash = hash.join("/");
        this.resizeMain();
      },
      immediate: false,
    },
  },
  created: function () {
    window.onhashchange = this.setRouteFromURL;
    this.resizeMain();
    this.setRouteFromURL();
    this.checkVW();
    this.update();
  },
});

function sortObject(obj, param) {
  var newObject = {};
  var sortable = [];
  for (var key in obj) {
    if (obj.hasOwnProperty(key)) sortable.push([key, obj[key]]);
    sortable.sort(function (a, b) {
      return b[1][param] - a[1][param];
    });
  }
  return sortable; //returns array not object!
}

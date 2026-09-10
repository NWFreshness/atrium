/* The Workroom — prototype behaviors */
(function () {
  // Theme toggle
  document.querySelectorAll("[data-theme-toggle]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var cur = document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
      var next = cur === "light" ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("atrium.theme", next); } catch (e) {}
    });
  });

  // Groove playback simulation
  var chassis = document.querySelector(".chassis");
  var play = document.querySelector(".play");
  var scope = document.querySelector("#scope");
  if (chassis && play) {
    var playing = false;
    play.addEventListener("click", function () {
      playing = !playing;
      chassis.classList.toggle("playing", playing);
    });
    if (scope) {
      var ctx = scope.getContext("2d");
      var t = 0;
      function draw() {
        var w = scope.width, h = scope.height;
        ctx.clearRect(0, 0, w, h);
        ctx.lineWidth = 2;
        ctx.strokeStyle = playing ? "#dfa33c" : "#4a4234";
        ctx.shadowColor = "rgba(223,163,60,0.55)";
        ctx.shadowBlur = playing ? 8 : 0;
        ctx.beginPath();
        for (var x = 0; x < w; x++) {
          var y;
          if (playing) {
            y = h / 2 + Math.sin(x * 0.05 + t * 0.09) * h * 0.28 * Math.sin(t * 0.03 + 1) +
              Math.sin(x * 0.11 - t * 0.2) * h * 0.07;
          } else {
            y = h / 2 + Math.sin(x * 0.05) * 1.2;
          }
          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
        t += 1;
        // VU levels
        if (playing) {
          document.querySelectorAll(".vu .tube").forEach(function (tube, i) {
            var lvl = 0.42 + Math.abs(Math.sin(t * 0.05 + i * 1.3)) * 0.45 + Math.random() * 0.1;
            tube.style.setProperty("--lvl", lvl);
            tube.firstElementChild && (tube.style.transform = "");
            tube.querySelector && (tube.style.setProperty("--x", lvl), 0);
            var drawn = tube.querySelector(".pump") || (function () {
              var d = document.createElement("div"); d.className = "pump";
              d.style.cssText = "position:absolute;inset:0;border-radius:5px;background:linear-gradient(180deg,#cd7258 0%,#dfa33c 38%,#8fae83 78%);transform-origin:bottom;transition:transform .18s cubic-bezier(.3,.7,.3,1);";
              tube.appendChild(d); return d;
            })();
            drawn.style.transform = "scaleY(" + Math.min(1, lvl).toFixed(2) + ")";
          });
        }
        requestAnimationFrame(draw);
      }
      draw();
    }
  }
})();

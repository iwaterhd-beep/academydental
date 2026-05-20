(function () {
  try {
    if (localStorage.getItem("vallodental_theme") === "light") {
      document.documentElement.classList.add("light");
    }
  } catch (_) {}
})();

const prefixInput = document.getElementById("duplicate-prefix");
const opacityInput = document.getElementById("duplicate-opacity");
const status = document.getElementById("status");

getSettings().then((settings) => {
  prefixInput.value = settings.duplicatePrefix;
  opacityInput.value = settings.duplicateOpacity;
});

document.getElementById("options-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  await saveSettings({
    duplicatePrefix: prefixInput.value,
    duplicateOpacity: parseFloat(opacityInput.value),
  });
  status.textContent = "Saved.";
  setTimeout(() => { status.textContent = ""; }, 1500);
});

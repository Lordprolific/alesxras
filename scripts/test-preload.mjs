// tsx 4 reads os.userInfo() to make a temp directory when geteuid is absent.
// Windows Node 25 can throw from os.userInfo() in this environment, so provide
// a stable temp-directory suffix for test processes only.
if (typeof process.geteuid !== "function") {
  process.geteuid = () => 0;
}

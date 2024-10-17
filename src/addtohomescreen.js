/* Add to Homescreen v4.0.0 ~ (c) 2019 Chris Love ~ @license: https://love2dev.com/pwa/add-to-homescreen/ */
/*
Check out these PWA Resources:

https://love2dev.com/pwa/pwa-starter/
https://pwastarter.love2dev.com/
https://love2dev.com/blog/beforeinstallprompt/

*/

/*
	   _   _ _____     _____
 ___ _| |_| |_   _|___|  |  |___ _____ ___ ___ ___ ___ ___ ___ ___
| .'| . | . | | | | . |     | . |     | -_|_ -|  _|  _| -_| -_|   |
|__,|___|___| |_| |___|__|__|___|_|_|_|___|___|___|_| |___|___|_|_|
	by Matteo Spinelli ~ http://cubiq.org <-- No longer there :<
	Upgraded for PWA Support by Chris Love ~ https://love2dev.com/
	USE PWA Starter to scaffold your core PWA files ~ https://pwastarter.love2dev.com/
*/


(function (window, document, undefined) {
	"use strict";

	// Load session
	let nativePrompt = false,
		_instance,
		_canPrompt,
		_canInstall,
		session = {
			"added": false
		};

	let platform = {
		isCompatible: false,
		beforeInstallPrompt: null
	},
		options = {},
		defaults = {
			appID: "com.love2dev.addtohome",
			appName: "Progressive Web App",
			debug: false,
			logging: false,
			modal: false,
			mandatory: false,
			autostart: true,
			skipFirstVisit: false,
			minSessions: 0,
			startDelay: 1,
			lifespan: 15,
			displayPace: 1, // Change to 1 minute
			mustShowCustomPrompt: false,
			maxDisplayCount: 0,
			validLocation: [],
			onInit: null,
			onShow: null,
			onAdd: null,
			onInstall: null,
			onCancel: null,
			customCriteria: null,
			manualPrompt: null
		};

	const _defaultSession = {
		lastDisplayTime: 0,
		returningVisitor: false,
		displayCount: 0,
		optedout: false,
		added: false,
		sessions: 0,
		nextSession: 0
	};

	function ath(settings) {
		if (!_instance) {
			_instance = {
				trigger,
				updateSession,
				clearSession,
				removeSession,
				optOut,
				optIn,
				clearDisplayCount,
				triggerNativePrompt
			};

			if ("serviceWorker" in navigator) {
				const manifestEle = document.querySelector("[rel='manifest']");

				if (!manifestEle) {
					console.log("no manifest file");
				} else {
					options = Object.assign({}, defaults, settings);

					navigator.serviceWorker.getRegistration().then(afterSWCheck);
				}
			} else {
				writeLog("service worker not supported");
				writeLog("Add to homescreen: not displaying callout because service workers are not supported");
			}
		}

		return _instance;
	}

	function writeLog(logStr) {
		if (options.logging) {
			if (options.logger) {
				options.logger.log(logStr);
			} else {
				console.log(logStr);
			}
		}
	}

	if ("onbeforeinstallprompt" in window) {
		window.addEventListener("beforeinstallprompt", beforeInstallPrompt);
		nativePrompt = true;
	}

	if ("onappinstalled" in window) {
		window.addEventListener("appinstalled", (evt) => {
			writeLog("a2hs installed");
			session.added = true;
			updateSession();

			if (options.onInstall) {
				options.onInstall(evt);
			}
		});
	}

	function checkPlatform() {

		const _ua = window.navigator.userAgent;

		platform.isIDevice = /iphone|ipod|ipad|macintosh/i.test(_ua) && 'ontouchend' in document;
		platform.isSamsung = /Samsung/i.test(_ua);
		platform.isFireFox = /Firefox/i.test(_ua);
		platform.isOpera = /opr/i.test(_ua);
		platform.isEdge = /Edg/i.test(_ua); // Edge on Chromium
		platform.isChrome = /Chrome/.test(_ua) && !platform.isEdge; // Chrome but not Edge
		platform.isAndroid = /android/i.test(_ua);
		platform.isWindows = /Windows NT/i.test(_ua);
		platform.isMacOS = /Macintosh/i.test(_ua) && !platform.isIDevice; // MacOS but not iDevices

		if (platform.isFireFox) {
			platform.isFireFox = /android/i.test(_ua);
		}

		if (platform.isOpera) {
			platform.isOpera = /android/i.test(_ua);
		}

		platform.isChromium = "onbeforeinstallprompt" in window;
		platform.isInWebAppiOS = window.navigator.standalone === true;
		platform.isInWebAppChrome = window.matchMedia("(display-mode: standalone)").matches;
		platform.isMobileSafari = platform.isIDevice && _ua.indexOf("Safari") > -1 && _ua.indexOf("CriOS") < 0;
		platform.isStandalone = platform.isInWebAppiOS || platform.isInWebAppChrome || window.matchMedia("(display-mode: fullscreen)").matches;
		platform.isiPad = platform.isMobileSafari && _ua.indexOf("iPad") > -1;
		platform.isiPhone = platform.isMobileSafari && _ua.indexOf("iPad") === -1;

		platform.isCompatible = platform.isChromium || platform.isMobileSafari || platform.isSamsung || platform.isFireFox || platform.isOpera || platform.isIDevice;
		platform.isInstalled = session.added;

		if (platform.isStandalone) {
			session.added = true;
			platform.isInstalled = true;
			updateSession();
		}

	}

	async function triggerNativePrompt() {
		if (!platform.beforeInstallPrompt) {
			return Promise.resolve();
		}

		try {
			const promptEvt = await platform.beforeInstallPrompt.prompt();
			const choiceResult = await platform.beforeInstallPrompt.userChoice;

			session.added = choiceResult.outcome === "accepted";

			if (session.added) {
				writeLog("User accepted the A2HS prompt");

				if (options.onAdd) {
					options.onAdd(choiceResult);
				}
			} else {
				if (options.onCancel) {
					options.onCancel(choiceResult);
				}

				session.optedout = true;
				writeLog("User dismissed the A2HS prompt");
			}

			updateSession();
			platform.beforeInstallPrompt = null;

		} catch (err) {
			writeLog(err.message);

			if (err.message.indexOf("user gesture") > -1) {
				options.mustShowCustomPrompt = true;
				_delayedShow();
			} else if (err.message.indexOf("The app is already installed") > -1) {
				session.added = true;
				updateSession();
			} else {
				console.log(err);
				return err;
			}
		}
	}

	function getPlatform(native) {
		if (options.debug && typeof options.debug === "string") {
			return options.debug;
		}

		if (platform.isChromium && native === undefined && !native) {
			return "native";
		} else if (platform.isFireFox) {
			return "firefox";
		} else if (platform.isiPad) {
			return "ipad";
		} else if (platform.isiPhone) {
			return "iphone";
		} else if (platform.isOpera) {
			return "opera";
		} else if (platform.isSamsung) {
			return "samsung";
		} else if (platform.isEdge) {
			return "edge";
		} else if (platform.isChromium) {
			return "chromium";
		} else {
			return "";
		}
	}

	function beforeInstallPrompt(evt) {

		evt.preventDefault();
		platform.beforeInstallPrompt = evt;

		// Call the onBeforeInstallPrompt callback if it is defined
		if (options.onBeforeInstallPrompt) {
			options.onBeforeInstallPrompt(platform);
		}

	}

	function removeSession(appID) {
		localStorage.removeItem(appID || ath.defaults.appID);
	}

	platform.cancelPrompt = function (evt) {
		evt.preventDefault();

		if (options.onCancel) {
			options.onCancel();
		}

		return false;
	};

	platform.handleInstall = function (evt) {
		if (options.onInstall) {
			options.onInstall(evt);
		}

		if (platform.beforeInstallPrompt && (!options.debug || getPlatform() === "native")) {
			triggerNativePrompt();
		}

		return false;
	};

	async function afterSWCheck(sw) {
		_instance.sw = sw;

		if (!_instance.sw) {
			console.log("no service worker");
			platform.isCompatible = false;
			return;
		}

		session = JSON.parse(localStorage.getItem(options.appID));

		if (!session) {
			session = _defaultSession;
		}

		if (typeof session === "string") {
			session = JSON.parse(session);
		}

		session.sessions += 1;
		updateSession();

		checkPlatform();

		if (options && options.debug && typeof options.logging === "undefined") {
			options.logging = true;
		}

		options.mandatory = options.mandatory && ("standalone" in window.navigator || options.debug);

		options.modal = options.modal || options.mandatory;

		if (options.mandatory) {
			options.startDelay = -0.5;
		}

		if (options.debug) {
			platform.isCompatible = true;
		}

		if (options.onInit) {
			options.onInit(_instance);
		}

		if (options.autostart) {
			writeLog("Add to homescreen: autostart displaying callout");
			show();
		} else if (!nativePrompt) {
			show();
		} else {
			_show();
		}
	}

	function passCustomCriteria() {
		if (options.customCriteria !== null || options.customCriteria !== undefined) {
			let passCustom = false;

			if (typeof options.customCriteria === "function") {
				passCustom = options.customCriteria();
			} else {
				passCustom = !!options.customCriteria;
			}

			options.customCriteria = passCustom;

			if (!passCustom) {
				writeLog("Add to homescreen: not displaying callout because a custom criteria was not met.");
			}

			return passCustom;
		}

		return options.customCriteria;
	}

	function canInstall() {

		if (_canInstall !== undefined) {
			return _canInstall;
		}

		_canInstall = false;

		_instance.beforeInstallPrompt = "onbeforeinstallprompt" in window;

		if (!passCustomCriteria()) {
			_canInstall = false;
			return false;
		}

		if (!session.optedout && !session.added && !platform.isStandalone && platform.isCompatible && !platform.isInWebAppiOS) {
			_canInstall = true;
			return true;
		}

		return _canInstall;
	}

	function canPrompt() {

		if (_canPrompt !== undefined) {
			return _canPrompt;
		}

		_canPrompt = false;

		if (platform.isInstalled) {
			return _canPrompt;
		}

		if (!passCustomCriteria()) {
			_canInstall = false;
			return false;
		}

		if (!platform.isCompatible) {
			writeLog("Add to homescreen: not displaying callout because device not supported");
			return false;
		}

		const now = Date.now();
		const lastDisplayTime = session.lastDisplayTime;

		if (now - lastDisplayTime < options.displayPace * 60000) {
			writeLog("Add to homescreen: not displaying callout because displayed recently");
			return false;
		}

		if (options.maxDisplayCount && session.displayCount >= options.maxDisplayCount) {
			writeLog("Add to homescreen: not displaying callout because displayed too many times already");
			return false;
		}

		if (session.sessions < options.minSessions) {
			writeLog("Add to homescreen: not displaying callout because not enough visits");
			return false;
		}

		if (options.nextSession && options.nextSession > 0 && session.sessions >= options.nextSession) {
			writeLog("Add to homescreen: not displaying callout because waiting on session " + options.nextSession);
			return false;
		}

		if (session.optedout) {
			writeLog("Add to homescreen: not displaying callout because user opted out");
			return false;
		}

		if (session.added) {
			writeLog("Add to homescreen: not displaying callout because already added to the homescreen");
			return false;
		}

		if (platform.isStandalone) {

			if (!session.added) {
				session.added = true;
				updateSession();

				if (options.onAdd) {
					options.onAdd(_instance, session);
				}
			}

			writeLog("Add to homescreen: not displaying callout because in standalone mode");
			return false;
		}

		if (!session.returningVisitor) {
			session.returningVisitor = true;
			updateSession();

			if (options.skipFirstVisit) {
				writeLog("Add to homescreen: not displaying callout because skipping first visit");
				return false;
			}
		}

		_canPrompt = true;
		return true;
	}

	function show(force) {
		if (session.shown && !force) {
			writeLog("Add to homescreen: not displaying callout because already shown on screen");
			return;
		}

		session.shown = true;

		if (document.readyState === "interactive" || document.readyState === "complete") {
			_delayedShow();
		} else {
			document.onreadystatechange = function () {
				if (document.readyState === "complete") {
					_delayedShow();
				}
			};
		}
	}

	function _delayedShow(e) {
		setTimeout(_show, options.startDelay * 1000 + 500);
	}

	function _show() {

		if (canPrompt()) {

			_instance.beforeInstallPrompt = "onbeforeinstallprompt" in window;

			if (options.onShow) {
				options.onShow(platform, session, _instance);
			}

			session.lastDisplayTime = Date.now();
			session.displayCount++;
			updateSession();

		} else if (canInstall()) {

			if (options.onCanInstall) {

				options.onCanInstall(platform, session, _instance);

			}

		} else if (platform.isInstalled) {

			if (options.onInstalled) {
				options.onInstalled(platform, session, _instance);
			}

		} else {

			if (platform.isCompatible && options.onShow && !platform.isInstalled) {
				// Handle iOS scenario explicitly
				options.onShow(platform, session, _instance);
			}

		}

	}

	function trigger() {
		_show();
	}

	function updateSession() {
		localStorage.setItem(options.appID, JSON.stringify(session));
	}

	function clearSession() {
		session = _defaultSession;
		updateSession();
	}

	function optOut() {
		session.optedout = true;
		updateSession();
	}

	function optIn() {
		session.optedout = false;
		updateSession();
	}

	function clearDisplayCount() {
		session.displayCount = 0;
		session.shown = false; // Reset the shown flag
		session.lastDisplayTime = 0; // Reset the last display time
		updateSession();
	}

	window.addToHomescreen = ath;

})(window, document);
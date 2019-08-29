/* Add to Homescreen v4.0.0 ~ (c) 2019 Chris Love ~ @license: https://love2dev.com/pwa/add-to-homescreen/ */

( function ( window, document, undefined ) {

	"use strict";

	/*
	       _   _ _____     _____
	 ___ _| |_| |_   _|___|  |  |___ _____ ___ ___ ___ ___ ___ ___ ___
	| .'| . | . | | | | . |     | . |     | -_|_ -|  _|  _| -_| -_|   |
	|__,|___|___| |_| |___|__|__|___|_|_|_|___|___|___|_| |___|___|_|_|
		by Matteo Spinelli ~ http://cubiq.org <-- No longer there :<
		Upgraded for PWA Support by Chris Love ~ https://love2dev.com/
	*/

	// load session
	var appID = "com.love2dev.addtohome",
		nativePrompt = false,
		session = localStorage.getItem( appID );

	if ( session && session.added ) {
		return;
	}

	if ( "onbeforeinstallprompt" in window ) {

		window.addEventListener( "beforeinstallprompt", beforeInstallPrompt );

		nativePrompt = true;

	}

	if ( "onappinstalled" in window ) {

		window.addEventListener( "appinstalled", function ( evt ) {

			// TODO: update session object to reflect the PWA has been installed
			_instance.doLog( "a2hs", "installed" );

			session.added = true;

			_instance.updateSession();

			if ( this.options.onInstall ) {
				this.options.onInstall.call( this );
			}

		} );

	}

	var platform = {},
		defaultPrompt = {
			title: "Install this PWA?",
			src: "imgs/pwa-logo-50x50.png",
			cancelMsg: "Not Now",
			installMsg: "Install"
		};

	function checkPlatform() {

		// browser info and capability
		var _ua = window.navigator.userAgent;

		platform.isIDevice = ( /iphone|ipod|ipad/i ).test( _ua );
		platform.isSamsung = /Samsung/i.test( _ua );
		platform.isFireFox = /Firefox/i.test( _ua );
		platform.isOpera = /opr/i.test( _ua );
		platform.isEdge = /edg/i.test( _ua );

		// Opera & FireFox only Trigger on Android
		if ( platform.isFireFox ) {
			platform.isFireFox = /android/i.test( _ua );
		}

		if ( platform.isOpera ) {
			platform.isOpera = /android/i.test( _ua );
		}

		platform.isChromium = ( "onbeforeinstallprompt" in window );
		platform.isInWebAppiOS = ( window.navigator.standalone === true );
		platform.isInWebAppChrome = ( window.matchMedia( '(display-mode: standalone)' ).matches );
		platform.isMobileSafari = platform.isIDevice && _ua.indexOf( 'Safari' ) > -1 && _ua.indexOf( 'CriOS' ) < 0;
		platform.isStandalone = platform.isInWebAppiOS || platform.isInWebAppChrome;
		platform.isiPad = ( platform.isMobileSafari && _ua.indexOf( 'iPad' ) > -1 );
		platform.isiPhone = ( platform.isMobileSafari && _ua.indexOf( 'iPad' ) === -1 );
		platform.isCompatible = ( platform.isChromium || platform.isMobileSafari ||
			platform.isSamsung || platform.isFireFox || platform.isOpera );

		// console.log( "platform.isiPhone: " + platform.isiPhone );
		// console.log( "platform.isMobileSafari: " + platform.isMobileSafari );
		// console.log( "platform.isInWebAppiOS: " + platform.isInWebAppiOS );
		// console.log( "platform.isCompatible: " + platform.isCompatible );

	}

	/* displays native A2HS prompt & stores results */
	function triggerNativePrompt() {

		return _beforeInstallPrompt.prompt()
			.then( function ( evt ) {

				// Wait for the user to respond to the prompt
				return _beforeInstallPrompt.userChoice;

			} )
			.then( function ( choiceResult ) {

				session.added = ( choiceResult.outcome === "accepted" );

				if ( session.added ) {
					_instance.doLog( "User accepted the A2HS prompt" );

					if ( _instance.options.onAdd ) {
						_instance.options.onAdd();
					}

				} else {

					if ( _instance.options.onCancel ) {
						_instance.options.onCancel();
					}

					session.optedout = true;
					_instance.doLog( "User dismissed the A2HS prompt" );
				}

				_instance.updateSession();

				_beforeInstallPrompt = null;

			} )
			.catch( function ( err ) {

				_instance.doLog( err.message );

				if ( err.message.indexOf( "user gesture" ) > -1 ) {
					_instance.options.mustShowCustomPrompt = true;
					_instance._delayedShow();
				} else if ( err.message.indexOf( "The app is already installed" ) > -1 ) {

					console.log( err.message );
					session.added = true;
					_instance.updateSession();

				} else {

					console.log( err );

					return err;
				}

			} );
	}

	function getPlatform( native ) {

		if ( _instance.options.debug &&
			typeof _instance.options.debug === "string" ) {
			return _instance.options.debug;
		}

		if ( platform.isChromium && ( native === undefined && !native ) ) {
			return "native";
		} else if ( platform.isFireFox ) {
			return "firefox";
		} else if ( platform.isiPad ) {
			return "ipad";
		} else if ( platform.isiPhone ) {
			return "iphone";
		} else if ( platform.isOpera ) {
			return "opera";
		} else if ( platform.isSamsung ) {
			return "samsung";
		} else if ( platform.isEdge ) {
			return "edge";
		} else if ( platform.isChromium ) {
			return "chromium";
		} else {
			return "";
		}

	}

	function isVisble( ele ) {

		var dimensions = ele.getBoundingClientRect();

		return dimensions.width !== 0 && dimensions.height !== 0;

	}

	//show hint images for browsers without native prompt
	/*
		Currently: iOS Safari
			FireFox Android
			Samsung Android
			Opera Android
	*/
	function showPlatformGuidance( skipNative ) {

		var target = getPlatform( skipNative ),
			ath_wrapper = document.querySelector( _instance.options.athWrapper );

		if ( ath_wrapper ) {

			if ( _instance.autoHideTimer ) {
				clearTimeout( _instance.autoHideTimer );
			}

			if ( !skipNative && target === "native" && _beforeInstallPrompt ) {

				platform.closePrompt();
				triggerNativePrompt();

			} else {

				var promptTarget = Object.assign( {}, defaultPrompt, _instance.options.customPrompt, _instance.options.prompt[ target ] );

				if ( promptTarget.targetUrl ) {

					location.replace( promptTarget.targetUrl );

				} else {

					var ath_body = ath_wrapper.querySelector( _instance.options.promptDlg.body );

					if ( promptTarget.imgs && promptTarget.imgs.length > 0 ) {

						ath_body.innerHTML = "";
						ath_body.classList.add( _instance.options.athGuidance );

						for ( var index = 0; index < promptTarget.imgs.length; index++ ) {

							var img = new Image();

							img.src = promptTarget.imgs[ index ].src;
							img.alt = promptTarget.imgs[ index ].alt;

							if ( promptTarget.imgs[ index ].classes ) {

								img.classList.add( ...promptTarget.imgs[ index ].classes );

							}

							img.classList.add( _instance.options.showClass );

							ath_body.appendChild( img );

						}

					}

					if ( !isVisble( ath_wrapper ) ) {

						ath_wrapper.classList.add( ...promptTarget.showClasses );
						ath_wrapper.classList.remove( _instance.options.hideClass );

					}

					var hideAfter = ( _instance.options.lifespan >= 10 ) ? _instance.options.lifespan : 10;

					_instance.autoHideTimer = setTimeout( _instance.autoHide, hideAfter * 1000 );

				}

			}

		}

	}

	//can be used to calculate the next prime number, a possible way to calculate when to next prompt
	function nextPrime( value ) {

		while ( true ) {

			var isPrime = true;

			if ( isNaN( value ) ) {
				value = 0;
			}

			//increment the number by 1 each time
			value += 1;

			var squaredNumber = Math.sqrt( value );

			//start at 2 and increment by 1 until it gets to the squared number
			for ( var i = 2; i <= squaredNumber; i++ ) {

				//how do I check all i's?
				if ( value % i == 0 ) {
					isPrime = false;
					break;
				}

			}

			if ( isPrime ) {
				return value;
			}

		}
	}

	// singleton
	var _instance;

	function ath( options ) {

		//prevent duplicate instances
		if ( !_instance ) {
			_instance || new ath.Class( options );
		}

		return _instance;

	}

	// default options
	ath.defaults = {
		appID: appID, // local storage name (no need to change)
		appName: "Progressive Web App",
		debug: false, // override browser checks
		logging: false, // log reasons for showing or not showing to js console; defaults to true when debug is true
		modal: false, // prevent further actions until the message is closed
		mandatory: false, // you can't proceed if you don't add the app to the homescreen
		autostart: true, // show the message automatically
		skipFirstVisit: false, // show only to returning visitors (ie: skip the first time you visit)
		minSessions: 0, //show only after minimum number of page views
		startDelay: 1, // display the message after that many seconds from page load
		lifespan: 15, // life of the message in seconds
		displayPace: 1440, // minutes before the message is shown again (0: display every time, default 24 hours)
		displayNextPrime: false,
		mustShowCustomPrompt: false,
		maxDisplayCount: 0, // absolute maximum number of times the message will be shown to the user (0: no limit)
		validLocation: [], // list of pages where the message will be shown (array of regexes)
		onInit: null, // executed on instance creation
		onShow: null, // executed when the message is shown
		onAdd: null, // when the application is launched the first time from the homescreen (guesstimate)
		onInstall: null,
		onCancel: null,
		customCriteria: null,
		manualPrompt: null,
		customPrompt: {}, //allow customization of prompt content
		athWrapper: ".ath-container",
		athGuidance: "ath-guidance",
		showClasses: [ "animated", "d-flex" ],
		showClass: "d-flex",
		hideClass: "d-none",
		promptDlg: {
			title: ".ath-banner-title",
			body: ".ath-banner",
			logo: ".ath-prompt-logo",
			cancel: ".btn-cancel",
			install: ".btn-install",
			action: {
				"ok": "Install",
				"cancel": "Not Now"
			}
		},
		prompt: {
			"native": {
				targetUrl: undefined,
				showClasses: [ "fadeInUp", "right-banner" ],
				action: {
					"ok": "Install",
					"cancel": "Not Now"
				}
			},
			"edge": {
				targetUrl: undefined,
				showClasses: [ "edge-wrapper",
					"animated", "fadeIn", "d-block", "right-banner"
				],
				imgs: [ {
					src: "imgs/edge-a2hs-icon.png",
					alt: "Tap the Add to Homescreen Icon"
				} ]
			},
			"chromium": {
				targetUrl: undefined,
				showClasses: [ "chromium-wrapper",
					"animated", "fadeIn", "d-block", "right-banner"
				],
				imgs: [ {
					src: "imgs/chromium-guidance.png",
					alt: "Tap the Add to Homescreen Icon"
				} ]
			},
			"iphone": {
				targetUrl: undefined,
				showClasses: [ "iphone-wrapper", "animated", "fadeIn", "d-block" ],
				imgs: [ {
						src: "imgs/ios-safari-share-button-highlight.jpg",
						alt: "Tap the Share Icon"
					},
					{
						src: "imgs/iphone-a2hs-swipe-to-right.jpg",
						classes: [ "animated", "fadeIn", "overlay-1",
							"delay-2s"
						],
						alt: "Swipe to the right"
					},
					{
						src: "imgs/iphone-a2hs-icon-highlight.jpg",
						classes: [ "animated", "fadeIn", "overlay-2",
							"delay-4s"
						],
						alt: "Tap the Add to Homescreen Icon"
					}
				]
			},
			"ipad": {
				targetUrl: undefined,
				showClasses: [ "ipad-wrapper", "animated", "fadeInUp", "d-block" ],
				imgs: [ {
					src: "imgs/safari-ipad-share-a2hs-right.jpg",
					alt: "Tap the Add to Homescreen Icon"
				} ]
			},
			"firefox": {
				targetUrl: undefined,
				showClasses: [ "firefox-wrapper",
					"animated", "fadeIn", "d-block"
				],
				imgs: [ {
					src: "imgs/firefox-a2hs-icon.png",
					alt: "Tap the Add to Homescreen Icon"
				} ]
			},
			"samsung": {
				targetUrl: undefined,
				showClasses: [ "samsung-wrapper",
					"animated", "fadeIn", "d-block"
				],
				imgs: [ {
					src: "imgs/samsung-internet-a2hs-icon.png",
					alt: "Tap the Add to Homescreen Icon"
				} ]
			},
			"opera": {
				targetUrl: undefined,
				showClasses: [ "opera-home-screen-wrapper",
					"animated", "fadeIn", "d-block"
				],
				imgs: [ {
					src: "imgs/opera-add-to-homescreen.png",
					alt: "Tap the Add to Homescreen Icon"
				} ]
			}
		}
	};

	checkPlatform();

	var _defaultSession = {
		lastDisplayTime: 0, // last time we displayed the message
		returningVisitor: false, // is this the first time you visit
		displayCount: 0, // number of times the message has been shown
		optedout: false, // has the user opted out
		added: false, // has been actually added to the homescreen
		sessions: 0,
		nextSession: 0 //tie this to nextPrime Counter
	};

	session = session ? JSON.parse( session ) : _defaultSession;

	var _beforeInstallPrompt;

	function beforeInstallPrompt( evt ) {

		evt.preventDefault();

		console.log( "capturing the native A2HS prompt" );

		_beforeInstallPrompt = evt;

		_instance._delayedShow();

	}

	ath.removeSession = function ( appID ) {

		localStorage.removeItem( appID || ath.defaults.appID );

	};

	ath.doLog = function ( logStr ) {

		if ( this.options.logging ) {

			console.log( logStr );
		}

	};

	platform.cancelPrompt = function ( evt ) {

		evt.preventDefault();

		if ( _instance.options.onCancel ) {
			_instance.options.onCancel();
		}

		platform.closePrompt();

		return false;

	};

	platform.closePrompt = function () {

		var ath_wrapper = document.querySelector( _instance.options.athWrapper );

		if ( ath_wrapper ) {

			ath_wrapper.classList.remove( ..._instance.options.showClasses );

		}

	};

	platform.handleInstall = function ( evt ) {

		if ( _instance.options.onInstall ) {
			_instance.options.onInstall();
		}

		if ( _beforeInstallPrompt &&
			( !_instance.options.debug || getPlatform() === "native" ) ) {

			platform.closePrompt();
			triggerNativePrompt();

		} else {

			showPlatformGuidance( true );

		}

		return false;
	};

	// TODO refactor long class method into smaller, more manageable functions
	ath.Class = function ( options ) {

		// class methods
		this.doLog = ath.doLog;

		// merge default options with user config
		this.options = Object.assign( {}, ath.defaults, options );

		_instance = this;

		if ( "serviceWorker" in navigator ) {

			var manifestEle = document.querySelector( "[rel='manifest']" );

			if ( !manifestEle ) {

				console.log( "no manifest file" );
				platform.isCompatible = false;
			}

			navigator.serviceWorker.getRegistration().then( afterSWCheck );

			buildGuidanceURLs( this.options.prompt );

		} else {
			afterSWCheck( {} );
		}

	};

	var guideanceTagetURLs = [];

	function buildGuidanceURLs( prompts ) {

		for ( var key in prompts ) {

			if ( prompts.hasOwnProperty( key ) ) {

				var target = prompts[ key ].targetUrl;

				if ( target ) {
					guideanceTagetURLs.push( target );
				}

			}

		}

	}

	function afterSWCheck( sw ) {

		_instance.sw = sw;

		if ( !_instance.sw ) {

			console.log( "no service worker" );
			platform.isCompatible = false;
		}

		session.sessions += 1;
		_instance.updateSession();

		// override defaults that are dependent on each other
		if ( _instance.options && _instance.options.debug && ( typeof _instance.options.logging === "undefined" ) ) {
			_instance.options.logging = true;
		}

		// normalize some options
		_instance.options.mandatory = _instance.options.mandatory && ( 'standalone' in window.navigator ||
			_instance.options.debug );

		//this is forcing the user to add to homescreen before anything can be done
		//the ideal scenario for this would be an enterprise business application
		//could also be a part of an onboarding workflow for a SAAS
		_instance.options.modal = _instance.options.modal || _instance.options.mandatory;

		if ( _instance.options.mandatory ) {
			_instance.options.startDelay = -0.5; // make the popup hasty
		}

		// setup the debug environment
		if ( _instance.options.debug ) {

			platform.isCompatible = true;

		}

		if ( _instance.options.onInit ) {
			_instance.options.onInit.call( _instance );
		}

		if ( _instance.options.autostart ) {

			_instance.doLog( "Add to homescreen: autostart displaying callout" );

			_instance.show();

		} else if ( !nativePrompt ) {

			_instance.show();

		}

	}

	ath.Class.prototype = {

		_canPrompt: undefined,

		//performs various checks to see if we are cleared for prompting
		canPrompt: function () {

			//already evaluated the situation, so don't do it again
			if ( this._canPrompt !== undefined ) {
				return this._canPrompt;
			}

			this._canPrompt = false;

			if ( _instance.options.customCriteria) {

				var passCustom = false;

				if ( typeof _instance.options.customCriteria === "function" ) {
					passCustom = _instance.options.customCriteria();
				} else {
					passCustom = !!_instance.options.customCriteria;
				}

				if ( !passCustom ) {

					this.doLog( "Add to homescreen: not displaying callout because a custom criteria was not met." );
					return false;

				}

			}

			//using a double negative here to detect if service workers are not supported
			//if not then don't bother asking to add to install the PWA
			if ( !( "serviceWorker" in navigator ) ) {

				this.doLog( "Add to homescreen: not displaying callout because service workers are not supported" );
				return false;

			}

			// the device is not supported
			if ( !platform.isCompatible ) {
				this.doLog( "Add to homescreen: not displaying callout because device not supported" );
				return false;
			}

			var now = Date.now(),
				lastDisplayTime = session.lastDisplayTime;

			// we obey the display pace (prevent the message to popup too often)
			if ( now - lastDisplayTime < this.options.displayPace * 60000 ) {
				this.doLog( "Add to homescreen: not displaying callout because displayed recently" );
				return false;
			}

			// obey the maximum number of display count
			if ( this.options.maxDisplayCount && session.displayCount >= this.options.maxDisplayCount ) {
				this.doLog( "Add to homescreen: not displaying callout because displayed too many times already" );
				return false;
			}

			// check if this is a valid location
			// TODO: should include at least the home page here
			// by default all pages are valid, which can cause issues on iOS
			// TODO: maybe trigger a redirect back to the home page for iOS
			var isValidLocation = !this.options.validLocation.length;

			for ( var i = this.options.validLocation.length; i--; ) {

				if ( this.options.validLocation[ i ].test( document.location.href ) ) {
					isValidLocation = true;
					break;
				}

			}

			if ( !isValidLocation ) {
				this.doLog( "Add to homescreen: not displaying callout because not a valid location" );
				return false;
			}

			var isGuidanceURL = false;

			for ( i = guideanceTagetURLs.length; i--; ) {

				if ( document.location.href.indexOf( guideanceTagetURLs[ i ] ) > -1 ) {
					isGuidanceURL = true;
					break;
				}

			}

			if ( isGuidanceURL ) {
				this.doLog( "Add to homescreen: not displaying callout because this is a guidance URL" );
				return false;
			}

			if ( session.sessions < this.options.minSessions ) {
				this.doLog( "Add to homescreen: not displaying callout because not enough visits" );
				return false;
			}

			if ( ( this.options.nextSession && this.options.nextSession > 0 ) &&
				session.sessions >= this.options.nextSession ) {
				this.doLog( "Add to homescreen: not displaying callout because waiting on session " + this.options.nextSession );
				return false;
			}

			// critical errors:
			if ( session.optedout ) {
				this.doLog( "Add to homescreen: not displaying callout because user opted out" );
				return false;
			}

			if ( session.added ) {
				this.doLog( "Add to homescreen: not displaying callout because already added to the homescreen" );
				return false;
			}

			// check if the app is in stand alone mode
			//this applies to iOS
			if ( platform.isStandalone ) {

				// execute the onAdd event if we haven't already
				if ( !session.added ) {

					session.added = true;
					this.updateSession();

					if ( this.options.onAdd ) {
						this.options.onAdd.call( this );
					}

				}

				this.doLog( "Add to homescreen: not displaying callout because in standalone mode" );
				return false;
			}

			// check if this is a returning visitor
			if ( !session.returningVisitor ) {

				session.returningVisitor = true;
				this.updateSession();

				// we do not show the message if this is your first visit
				if ( this.options.skipFirstVisit ) {
					this.doLog( "Add to homescreen: not displaying callout because skipping first visit" );
					return false;
				}

			}

			this._canPrompt = true;

			console.log( "end canPrompt" );

			return true;

		},

		show: function ( force ) {

			// message already on screen
			if ( _instance.shown ) {
				_instance.doLog( "Add to homescreen: not displaying callout because already shown on screen" );
				return;
			}

			_instance.shown = true;

			if ( document.readyState === "interactive" || document.readyState === "complete" ) {
				_instance._delayedShow();
			} else {

				document.onreadystatechange = function () {

					if ( document.readyState === 'complete' ) {
						_instance._delayedShow();
					}

				};

			}

		},

		_delayedShow: function ( e ) {

			setTimeout( _instance._show(), _instance.options.startDelay * 1000 + 500 );
		},

		_show: function () {

			if ( _instance.canPrompt() ) {

				if ( _beforeInstallPrompt && !_instance.options.mustShowCustomPrompt ) {

					triggerNativePrompt();

				} else {

					var target = getPlatform(),
						ath_wrapper = document.querySelector( _instance.options.athWrapper );

					if ( ath_wrapper && !session.optedout ) {

						ath_wrapper.classList.remove( _instance.options.hideClass );

						var promptTarget = Object.assign( {}, defaultPrompt, _instance.options.customPrompt, _instance.options.prompt[ target ] );

						if ( promptTarget.showClasses ) {

							promptTarget.showClasses = promptTarget.showClasses.concat( _instance.options.showClasses );

						} else {

							promptTarget.showClasses = _instance.options.showClasses;

						}

						for ( var index = 0; index < promptTarget.showClasses.length; index++ ) {

							ath_wrapper.classList.add( promptTarget.showClasses[ index ] );

						}

						//						ath_wrapper.classList.add( ...promptTarget.showClasses );

						var ath_title = ath_wrapper.querySelector( _instance.options.promptDlg.title ),
							ath_logo = ath_wrapper.querySelector( _instance.options.promptDlg.logo ),
							ath_cancel = ath_wrapper.querySelector( _instance.options.promptDlg.cancel ),
							ath_install = ath_wrapper.querySelector( _instance.options.promptDlg.install );

						if ( ath_title && promptTarget.title ) {
							ath_title.innerText = promptTarget.title;
						}

						if ( ath_logo && promptTarget.src ) {
							ath_logo.src = promptTarget.src;
							ath_logo.alt = promptTarget.title || "Install PWA";
						}

						if ( ath_install ) {
							ath_install.addEventListener( "click", platform.handleInstall );
							ath_install.classList.remove( _instance.options.hideClass );
							ath_install.innerText = promptTarget.installMsg ? promptTarget.installMsg :
								( ( promptTarget.action && promptTarget.action.ok ) ? promptTarget.action.ok : _instance.options.promptDlg.action.ok );
						}

						if ( ath_cancel ) {
							ath_cancel.addEventListener( "click", platform.cancelPrompt );
							ath_cancel.classList.remove( _instance.options.hideClass );
							ath_cancel.innerText = promptTarget.cancelMsg ? promptTarget.cancelMsg :
								( ( promptTarget.action && promptTarget.action.cancel ) ? promptTarget.action.cancel : _instance.options.promptDlg.action.cancel );
						}

					}

					if ( this.options.lifespan && this.options.lifespan > 0 ) {

						_instance.autoHideTimer = setTimeout( this.autoHide, this.options.lifespan * 1000 );

					}

				}

				// fire the custom onShow event
				if ( this.options.onShow ) {
					this.options.onShow.call( this );
				}

				// increment the display count
				session.lastDisplayTime = Date.now();
				session.displayCount++;

				if ( _instance.options.displayNextPrime ) {

					session.nextSession = nextPrime( session.sessions );

				}

				this.updateSession();

			}

		},

		trigger: function () {

			this._show();

		},

		autoHide: function () {

			var target = getPlatform(),
				ath_wrapper = document.querySelector( _instance.options.athWrapper );

			if ( ath_wrapper ) {

				var promptTarget = _instance.options.prompt[ target ];
				promptTarget.showClasses = promptTarget.showClasses.concat( _instance.options.showClasses );

				ath_wrapper.classList.remove( ...promptTarget.showClasses );
				ath_wrapper.classList.add( _instance.options.hideClass );

			}

		},

		updateSession: function () {

			localStorage.setItem( this.options.appID, JSON.stringify( session ) );

		},

		clearSession: function () {
			session = _defaultSession;
			this.updateSession();
		},

		optOut: function () {
			session.optedout = true;
			this.updateSession();
		},

		optIn: function () {
			session.optedout = false;
			this.updateSession();
		},

		clearDisplayCount: function () {
			session.displayCount = 0;
			this.updateSession();
		}

	};

	// expose to the world
	window.addToHomescreen = ath;

} )( window, document );

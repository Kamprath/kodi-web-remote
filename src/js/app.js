var App = App || {};

App = {
    serverUri: '/jsonrpc',
    refreshInterval: 5000,
    ws: null,

    /**
     * Application data
     * @type {Object}
     */
    data: {
        isFullScreen: false,
        playerId: 0,
        playerTitle: 'OSMC',
        volume: null,
        playing: false,
        wsConnected: false,
        failCount: 0
    },

    /**
     * jQuery selectors
     * @type {Object}
     */
    selectors: {
        button: '.btn',
        interface: '.interface',
        error: '.overlay-error',
        errorMsg: '.error-message',
        errorAction: '.error-action a',
        hidden: 'hidden',
        navigateButtons: '.btn-navigate',
        playbackButtons: '.btn-playback',
        playbackButton: '.btn-playpause',
        menuButtons: '.btn-menu',
        volume: 'input[type=range]',
        volumeUp: '.btn-volume-up',
        volumeDown: '.btn-volume-down',
        keyboard: '.btn-keyboard',
        inputOverlay: '.overlay-input',
        inputText: '.overlay-input input[type=text]',
        cancelInput: '.overlay-input a',
        nowPlaying: '.nowplaying'
    },

    /**
     * Initialize the application
     */
    init: function() {
        var self = this;

        this.initWs(self.initInterface);
        self.initEvents();
    },

    /**
     * Initialize event handlers
     */
    initEvents: function() {
        var self = this;

        // make API calls on button clicks
        $(this.selectors.navigateButtons + ', ' + this.selectors.menuButtons).on('click', self.navigate.bind(self));
        $(this.selectors.playbackButtons).on('click', self.controlPlayback.bind(self));
        $(this.selectors.keyboard).on('click', self.showKeyboard.bind(self));
        $(this.selectors.inputText).on('keydown', self.sendText.bind(self));

        // toggle fullscreen on button push
        $(this.selectors.button).on('click', self.useFullScreen.bind(self));

        // Close error when 'OK' is clicked
        $(this.selectors.errorAction).on('click', function() { self.toggleError(false); return false; });
        $(this.selectors.cancelInput).on('click', self.hideKeyboard.bind(self));

        // set fullscreen status on fullscreen state change
        $(document).on('webkitfullscreenchange mozfullscreenchange fullscreenchange', function(e) {
            self.setFullscreenStatus(!self.data.isFullScreen);
        });

        // Set and synchronize volume
        $(this.selectors.volume).on('change', self.setVolume.bind(self));
        $(this.selectors.volumeUp).on('click', self.increaseVolume.bind(self));
        $(this.selectors.volumeDown).on('click', self.decreaseVolume.bind(self));
    },

    /**
     * Open a WebSocket connection
     * @param  {Function} cb (Optional) A callback function to execute after connection attempt completes
     */
    initWs: function(cb) {
        var self = this;

        if (typeof window.WebSocket !== 'undefined') {
            this.ws = null; // reset
            this.ws = new WebSocket('ws://' + window.location.host + ':9090/jsonrpc');
            this.ws.onmessage = this.handleWsMsg.bind(this);
            this.ws.onerror = this.ws.onclose = function() {
                self.data.wsConnected = false;
                self.data.failCount++;
                if (self.data.failCount >= 3) {
                    (self.displayError.bind(self))('Failed to reach server.');
                }
            };
            this.ws.onopen = function() {
                self.data.wsConnected = true;
                self.data.failCount = 0;
                if (typeof cb !== 'undefined') {
                    cb.bind(self)();
                }
            };
        } else {
            if (typeof cb !== 'undefined') cb();
        }
    },

    /**
     * Make API calls to update interface state
     */
    initInterface: function() {
        this.callApiMethod('Player.GetActivePlayers');
        this.callApiMethod('Application.GetProperties', {'properties': ['volume']});
        this.sendNotification("Remote Connected", "OSMC is now being controlled remotely.");
    },

    /**
     * Set fullscreen status
     * @param {bool} status
     */
    setFullscreenStatus: function(status) {
        this.data.isFullScreen = status;
    },

    /**
     * Activate fullscreen
     */
    useFullScreen: function() {
        if (!this.data.isFullScreen) {
            var doc = window.document;
            var docEl = doc.documentElement;

            var requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
            var cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;

            if(!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
                requestFullScreen.call(docEl);
            }
            else {
                cancelFullScreen.call(doc);
            }
        }
    },

    /**
     * Update interface state
     */
    updateInterface: function() {
        $(this.selectors.nowplaying).text(this.data.title);
        $(this.selectors.volume).val(this.data.volume);
        if (this.data.playerTitle !== null) {
            $(this.selectors.nowPlaying).text((this.data.playerTitle.length > 21) ? this.data.playerTitle.substr(0, 22) + '...' : this.data.playerTitle);
        }

        if (this.data.playing) {
            $(this.selectors.playbackButton).removeClass('play').addClass('pause');
        } else {
            $(this.selectors.playbackButton).removeClass('pause').addClass('play');
        }
    },

    /**
     * Set media center volume to value of range input
     * @returns {boolean}   Returns false
     */
    setVolume: function() {
        this.callApiMethod($(this.selectors.volume).data('method'), {volume: parseInt($(this.selectors.volume).val())});
        return false;
    },

    /**
     * Toggle visibility of error overlay
     * @param {bool} isVisible
     */
    toggleError: function(isVisible) {
        var $interface = $(this.selectors.interface);
        var $error = $(this.selectors.error);

        if (isVisible) {
            $interface.addClass(this.selectors.hidden);
            $error.removeClass(this.selectors.hidden);
        } else {
            $interface.removeClass(this.selectors.hidden);
            $error.addClass(this.selectors.hidden);
        }
    },

    /**
     * Display an error message as the result of a failed AJAX request
     * @param  {string} msg An error message
     */
    displayError: function(msg) {
        $(this.selectors.errorMsg).text(msg);
        this.toggleError(true);
    },

    /**
     * Show the text input interface
     * @returns {boolean}   Returns false
     */
    showKeyboard: function() {
        // show an overlay with a text input\
        $(this.selectors.interface).addClass(this.selectors.hidden);
        $(this.selectors.inputOverlay).removeClass(this.selectors.hidden);
        $(this.selectors.inputText).focus();
        return false;
    },

    /**
     * Hide text input interface
     * @returns {boolean}   Returns false
     */
    hideKeyboard: function() {
        $(this.selectors.interface).removeClass(this.selectors.hidden);
        $(this.selectors.inputOverlay).addClass(this.selectors.hidden);
        $(this.selectors.inputText).val('');
        $(this.selectors.playbackButton).focus();
        return false;
    },

    /**
     * Send a user notification to the server
     * @param  {string} title   A notification title
     * @param  {string} message A notification message
     */
    sendNotification: function(title, message) {
        this.callApiMethod("GUI.ShowNotification", {title: title, message: message});
    },

    /**
     * Send user text to server
     * @param e     The event
     */
    sendText: function(e) {
        // call API
        if (e.keyCode === 13) {
            this.callApiMethod('Input.SendText', {'text': $(this.selectors.inputText).val()});
            this.hideKeyboard();
        }
    },

    /**
     * Make an API call to the server using JSON-RPC
     * @param {string} method       An API method
     * @param {Object} params       (Optional) An object of parameters
     * @param {function} cb         (Optional) A callback function that will receive a JSON object of response data
     */
    callApiMethod: function(method, params, cb) {
        var self = this;
        var useCallback = typeof cb !== 'undefined' && cb !== null;
        var data = {
            id: Math.floor(Math.random()*(500-1))+1,
            jsonrpc: "2.0",
            method: method
        };
        if (typeof params !== 'undefined' && params !== null) data.params = params;

        function sendWsMsg() {
            self.ws.send(JSON.stringify(data));
        }

        // make the request using WebSockets or AJAX
        if (this.ws !== null) {
            // if WS connection was lost, reconnect
            if (this.data.wsConnected) {
                sendWsMsg();
            } else {
                this.initWs(sendWsMsg);
            }
        } else {
            var options = {
                url: this.serverUri,
                type: 'POST',
                timeout: 2000,
                dataType: 'json',
                contentType: 'application/json; charset=UTF-8',
                error: function() {
                    self.displayError.bind(self)('Unable to reach the server.');
                },
                success: function(data, xhr) {
                    if (useCallback) (cb.bind(self))(data);
                },
                data: JSON.stringify(data)
            };

            $.ajax(options);
        }
    },

    /**
     * Handle messages from WebSocket
     * @param e     The event
     */
    handleWsMsg: function(e) {
        var self = this;
        var msg = JSON.parse(e.data);

        if (typeof msg !== 'undefined' && msg !== null) {
            // Handle notifications
            if (typeof msg.id === 'undefined') {
                switch (msg.method) {
                    case 'Application.OnVolumeChanged':
                        this.data.volume = parseInt(msg.params.data.volume);
                        break;
                    case 'Player.OnPlay':
                        this.data.playing = true;
                        this.data.playerTitle = (typeof msg.params.data.item.title !== 'undefined') ? msg.params.data.item.title : 'OSMC';
                        this.callApiMethod('Player.GetActivePlayers');
                        break;
                    case 'Player.OnPause':
                        this.data.playerTitle = (typeof msg.params.data.item.title !== 'undefined') ? msg.params.data.item.title : 'OSMC';
                        this.data.playing = false;
                        break;
                    case 'Player.OnStop':
                        this.data.playing = false;
                        this.data.playerTitle = 'OSMC';
                        break;
                }

            // Handle responses
            } else if (typeof msg.id !== 'undefined') {
                if (msg.result.hasOwnProperty('volume')) {
                    this.data.volume = parseInt(msg.result.volume);
                } else if (typeof msg.result[0] !== 'undefined' && msg.result[0].hasOwnProperty('playerid')) {
                    this.data.playerId = msg.result[0].playerid;
                    this.data.playing = true;
                }
            }
        }

        this.updateInterface();
    },

    /**
     * Increase value of volume range input
     * @returns {boolean}   Returns false
     */
    increaseVolume: function() {
        var volume = parseInt($(this.selectors.volume).val());
        var step = parseInt($(this.selectors.volume).prop('step'));
        var max = parseInt($(this.selectors.volume).prop('max'));
        var min = parseInt($(this.selectors.volume).prop('min'));

        if ((volume + step) <= max) {
            $(this.selectors.volume).val(volume + step);
            this.setVolume();
        }

        return false;
    },

    /**
     * Increase value of volume range input
     * @returns {boolean}   Returns false
     */
    decreaseVolume: function() {
        var volume = parseInt($(this.selectors.volume).val());
        var step = parseInt($(this.selectors.volume).prop('step'));
        var max = parseInt($(this.selectors.volume).prop('max'));
        var min = parseInt($(this.selectors.volume).prop('min'));

        if ((volume - step) >= min) {
            $(this.selectors.volume).val(volume - step);
            this.setVolume();
        }

        return false;
    },

    /**
     * Call API method when navigational buttons are pressed
     * @param e
     * @returns {boolean}   Returns false
     */
    navigate: function(e) {
        this.callApiMethod($(e.target).data('method'));
        return false;
    },

    /**
     * Call API method when playback buttons are pressed
     * @param e {Object}    The event
     * @returns {boolean}   Returns false
     */
    controlPlayback: function(e) {
        this.callApiMethod($(e.target).data('method'), {playerid: this.data.playerId});
        return false;
    }
};
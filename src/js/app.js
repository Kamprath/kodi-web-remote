var App = App || {};

App = {
    serverUri: '/jsonrpc',
    refreshInterval: 5000,
    isFullScreen: false,
    ws: null,

    /**
     * Media center properties
     */
    properties: {
        playing: null,
        volume: null
    },

    /**
     * jQuery selectors
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
        cancelInput: '.overlay-input a'
    },

    /**
     * Initialize the application
     */
    init: function() {
        this.initWs();
        this.initEvents();
        this.syncInterface();
        this.sendNotification("Remote Connected", "OSMC is now being controlled remotely.");
    },

    /**
     * Initialize a WebSockets connection if available
     */
    initWs: function() {
        if (typeof window.WebSocket !== 'undefined') {
            this.ws = new WebSocket('ws://' + window.location.host + ':9090/jsonrpc');
            this.ws.onmessage = this.handleWsNotification.bind(this);
        }
    },

    sendNotification: function(title, message) {
        this.callApiMethod("GUI.ShowNotification", {title: title, message: message});
    },

    /**
     * Retrieve various server properties
     * @param {function} cb     A callback function
     */
    getProperties: function(cb) {
        var self = this;

        // Determine if anything is actively playing
        this.callApiMethod('Player.GetActivePlayers', null, function(data) {
            self.properties.playing = (typeof data.result.length !== 'undefined' && data.result.length > 0);

            // Get volume
            this.callApiMethod('Application.GetProperties', {'properties': ['volume']}, function(data) {
                self.properties.volume = data.result.volume;

                // Execute callback if set
                if (typeof cb !== 'undefined' && cb !== null) cb.bind(self)();
            });
        });
    },

    /**
     * Synchronize interface button states with server
     */
    syncInterface: function() {
        var self = this;

        this.getProperties(function() {
            // set playback button status
            if (self.properties.playing) {
                $(self.selectors.playbackButton).removeClass('play');
                $(self.selectors.playbackButton).addClass('pause');
            } else {
                $(self.selectors.playbackButton).removeClass('pause');
                $(self.selectors.playbackButton).addClass('play');
            }

            $(self.selectors.volume).val(self.properties.volume);
        });
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
            self.setFullscreenStatus(!self.isFullScreen);
        });

        // Set and synchronize volume
        $(this.selectors.volume).on('change', self.setVolume.bind(self))
        $(this.selectors.volumeUp).on('click', self.increaseVolume.bind(self));
        $(this.selectors.volumeDown).on('click', self.decreaseVolume.bind(self));
    },

    /**
     * Set fullscreen status
     * @param {bool} status
     */
    setFullscreenStatus: function(status) {
        this.isFullScreen = status;
    },

    /**
     * Activate fullscreen
     */
    useFullScreen: function() {
        if (!this.isFullScreen) {
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
     * Make an API call to the server using JSON-RPC
     * @param {string} method       An API method
     * @param {Object} params       (Optional) An object of parameters
     * @param {function} cb         (Optional) A callback function that will receive a JSON object of response data
     */
    callApiMethod: function(method, params, cb) {
        var self = this;
        var useCallback = typeof cb !== 'undefined' && cb !== null;
        var data = {
            id: 1,
            jsonrpc: "2.0",
            method: method
        };
        if (typeof params !== 'undefined' && params !== null) data.params = params;

        // make the request using WebSockets or AJAX
        if (this.ws !== null) {
            self.ws.send(JSON.stringify(data));

            // call the callback (if any) on message event
            if (useCallback) {
                var originalHandler = self.ws.onmessage;

                self.ws.onmessage = function(e) {
                    (cb.bind(self))(JSON.parse(e.data));

                    // reset onmessage handler back to default
                    self.ws.onmessage = originalHandler.bind(self);
                };
            }
        } else {
            var options = {
                url: this.serverUri,
                type: 'POST',
                timeout: 2000,
                dataType: 'json',
                contentType: 'application/json; charset=UTF-8',
                error: self.displayError.bind(self),
                success: function(data, xhr) {
                    if (useCallback) (cb.bind(self))(data);
                },
                data: JSON.stringify(data)
            };
        }


        $.ajax(options);
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
     * @param xhr
     * @param status
     */
    displayError: function(xhr, status) {
        $(this.selectors.errorMsg).text('Unable to reach the server.');
        this.toggleError(true);
    },

    /**
     * Set media center volume to value of range input
     * @returns {boolean}
     */
    setVolume: function() {
        this.callApiMethod($(this.selectors.volume).data('method'), {volume: parseInt($(this.selectors.volume).val())});
        this.syncInterface();
        return false;
    },

    /**
     * Increase value of volume range input
     * @returns {boolean}
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
     * @returns {boolean}
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
     * Call API method when navigational buttons are clicked
     * @param e
     * @returns {boolean}   Returns false
     */
    navigate: function(e) {
        this.callApiMethod($(e.target).data('method'));
        return false;
    },

    /**
     * Call API method when playback buttons are clicked
     * @param e
     * @returns {boolean}   Returns false
     */
    controlPlayback: function(e) {
        this.callApiMethod($(e.target).data('method'), {playerid: 0});
        return false;
    },

    showKeyboard: function(e) {
        // show an overlay with a text input\
        $(this.selectors.interface).addClass(this.selectors.hidden);
        $(this.selectors.inputOverlay).removeClass(this.selectors.hidden);
        $(this.selectors.inputText).focus();
        return false;
    },

    hideKeyboard: function() {
        $(this.selectors.interface).removeClass(this.selectors.hidden);
        $(this.selectors.inputOverlay).addClass(this.selectors.hidden);
        $(this.selectors.inputText).val('');
        return false;
    },

    sendText: function(e) {
        // call API
        if (e.keyCode === 13) {
            this.callApiMethod('Input.SendText', {'text': $(this.selectors.inputText).val()});
            this.hideKeyboard();
        }
    },

    handleWsNotification: function(e) {

    }
};
var App = App || {};

App = {
    serverUri: '/jsonrpc',
    isFullScreen: false,

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
        error: '.error',
        errorMsg: '.error-message',
        errorAction: '.error-action a',
        hidden: 'hidden',
        navigateButtons: '.btn-navigate',
        playbackButtons: '.btn-playback',
        playbackButton: '.btn-playpause',
        menuButtons: '.btn-menu'
    },

    /**
     * Initialize the application
     */
    init: function() {
        this.initEvents();
        this.syncInterface();
    },

    /**
     * Retrieve various server properties
     * @param {function} cb     A callback function
     */
    getProperties: function(cb) {
        var self = this;

        // Determine if anything is actively playing
        this.callApiMethod('Player.GetActivePlayers', null, function(data) {
            self.properties.playing = (data.result.length > 0);

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

            // todo: set volume bar
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

        // toggle fullscreen on button push
        $(this.selectors.button).on('click', self.useFullScreen.bind(self));

        // sync interface when changing volume or playback
        $(this.selectors.playbackButtons).on('click', self.syncInterface.bind(self));

        // Close error when 'OK' is clicked
        $(this.selectors.errorAction).on('click', function() { self.toggleError(false); return false; });

        // set fullscreen status on fullscreen state change
        $(document).on('webkitfullscreenchange mozfullscreenchange fullscreenchange', function(e) {
            self.setFullscreenStatus(!self.isFullScreen);
        });
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

        var data = {
            id: 1,
            jsonrpc: "2.0",
            method: method
        };

        if (typeof params !== 'undefined' && params !== null) data.params = params;

        var options = {
            url: this.serverUri,
            type: 'POST',
            dataType: 'json',
            contentType: 'application/json; charset=UTF-8',
            error: self.displayError.bind(self),
            success: function(data) {
                self.toggleError(false);
                if (typeof cb !== 'undefined' && cb !== null) cb.bind(self)();
            },
            data: JSON.stringify(data)
        };


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
    }
};
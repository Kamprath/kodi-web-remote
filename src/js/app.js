var App = App || {};

App = {
    serverUrl: '/jsonrpc',
    isFullScreen: false,

    selectors: {
        button: '.btn',
        navigateButtons: '.btn-navigate',
        playbackButtons: '.btn-playback',
        playbackButton: '.btn-playpause',
        menuButtons: '.btn-menu'
    },

    properties: {
        volume: null,
        playing: null
    },

    init: function() {
        this.initEvents();
        this.getProperties();
    },

    getProperties: function() {
        var self = this;

        this.callApiMethod('Player.GetActivePlayers', null, function(data) {
            self.properties.playing = (data.result.length > 0);

            if (self.properties.playing) {
                self.togglePlaybackButton();
            }
        });

        this.callApiMethod('Application.GetProperties', {'properties': ['volume']}, function(data) {
            self.properties.volume = data.result.volume;
        });
    },

    initEvents: function() {
        var self = this;

        // make API calls on button clicks
        $(this.selectors.navigateButtons + ', ' + this.selectors.menuButtons).on('click', self.navigate.bind(self));
        $(this.selectors.playbackButtons).on('click', self.controlPlayback.bind(self));

        // control fullscreen
        $(this.selectors.button).on('click.fullscreenEvent', self.useFullScreen.bind(self));
        $(window).on('blur', self.disableFullscreen.bind(self));

        $(window).on('focus', self.getProperties.bind(self));
    },

    disableFullscreen: function() {
        this.isFullScreen = false;
    },

    useFullScreen: function() {
        if (!this.isFullScreen) {
            var doc = window.document;
            var docEl = doc.documentElement;

            var requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
            var cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;

            if(!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
                requestFullScreen.call(docEl);
                this.isFullScreen = true;
                //$(this.selectors.button).unbind('click.fullscreenEvent');
            }
            else {
                cancelFullScreen.call(doc);
            }
        }
    },

    callApiMethod: function(method, params, cb) {
        var data = {
            id: 1,
            jsonrpc: "2.0",
            method: method
        };

        if (typeof params !== 'undefined' && params !== null) data.params = params;

        var options = {
            url: this.serverUrl,
            type: 'POST',
            dataType: 'json',
            contentType: 'application/json; charset=UTF-8',
            data: JSON.stringify(data)
        };

        if (typeof cb !== 'undefined' && cb !== null) options.success = cb;

        $.ajax(options);
    },

    navigate: function(e) {
        this.callApiMethod($(e.target).data('method'));
        return false;
    },
    controlPlayback: function(e) {
        var method = $(e.target).data('method');

        if (method === 'Player.PlayPause') this.togglePlaybackButton();
        this.callApiMethod(method, {playerid: 0});

        return false;
    },

    togglePlaybackButton: function() {
        $(this.selectors.playbackButton).toggleClass('play');
        $(this.selectors.playbackButton).toggleClass('pause');
    }
};
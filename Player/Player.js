function convertInTimeText(totalSeconds) {
    var minutes = Math.floor((parseInt(totalSeconds) / 60));
    var hours = Math.floor((parseInt(minutes) / 60));
    minutes = Math.floor((parseInt(minutes) % 60));
    var seconds = (parseInt(totalSeconds) % 60);

    var format = '';
    if (hours > 0) {
        format += ((hours < 10) ? "0" + hours : hours) + ':';
    }
    format += ((minutes < 10) ? "0" + minutes : minutes) + ':';
    format += ((seconds < 10) ? "0" + seconds : seconds);

    return format;
};

Vue.component('video-player', {
    template: '#video-player-template',
    props: ['dashManifestUrl', 'hlsManifestUrl', 'poster'],
    data: function () {
        return {
            status: 'stopped', // 'playing', 'stopped', 'ended'
            isBuffering: false,
            durationText: '00:00',
            currentTimeText: '00:00',
            currentProgress: 0,
            handle: null,
            showVolumeBar: false,
            videoTracks: [],
            selectedTrack: null,
            fullScreenView: false
        }
    },
    mounted: function () {
        var _this = this;

        console.log(this.poster);

        var video = this.video = this.$refs.video;

        window.player = this.shakaPlayer = new shaka.Player(this.video);

        // this.shakaPlayer.addEventListener('error', onErrorEvent);

        this.shakaPlayer.addEventListener('buffering', this.buffering);

        this.shakaPlayer.addEventListener('adaptation', this.trackChanged);

        var onSuccess = this.initiate();

        this.shakaPlayer.load(this.dashManifestUrl).then(onSuccess).catch(function (err) {
            console.log(err);
        });
    },
    methods: {

        initiate: function () {
            var _this = this;

            var handle = setInterval(function (t) {

                if (_this.video.readyState > 0) {

                    // Set video duration
                    var duration = Math.round(_this.video.duration);
                    _this.durationText = convertInTimeText(duration);

                    // Set progress bar
                    var currentTime = 0;
                    var progressBar = _this.$refs.progressBar;
                    $(progressBar).slider({
                        orientation: "horizontal",
                        range: "min",
                        max: duration,
                        value: 0,
                        stop: _this.seek,
                        slide: _this.seek
                    });

                    // Set volume bar
                    var volume = 1;
                    var volumeBar = _this.$refs.volumeBar;
                    $(volumeBar).slider({
                        orientation: "horizontal",
                        range: "min",
                        step: 0.1,
                        min: 0,
                        max: 1,
                        value: volume,
                        slide: _this.volume
                    });
                    _this.video.volume = volume;

                    // Get video tracks
                    _this.videoTracks = _this.shakaPlayer.getVariantTracks();

                    // Set fullscreen listener
                    $(document).on('webkitfullscreenchange mozfullscreenchange fullscreenchange', function (e) {
                        if (!window.screenTop && !window.screenY) {
                            _this.fullScreenView = true;
                        } else {
                            _this.fullScreenView = false;
                        }
                    });

                    // Set hover effect on controls
                    var videoControls = _this.$refs.videoControls;
                    $(videoControls).hover(function () {
                        $(this).css('opacity', 1);
                    }, function () {
                        $(this).css('opacity', 0);
                    })

                    clearInterval(handle);
                }
            }, 500);

        },

        handleProgress: function () {

            var _this = this;

            return setInterval(function () {

                // Set current time
                var currentTime = Math.round(_this.video.currentTime);
                _this.currentTimeText = convertInTimeText(currentTime);

                // Paint progress bar
                _this.currentProgress = Math.round((100 * currentTime) / _this.video.duration);
                var progressBar = _this.$refs.progressBar;
                $(progressBar).slider("value", Math.round(currentTime));

                // Show reload icon
                if (_this.videoEnded()) {
                    _this.status = 'ended';
                    _this.handle = null;
                }

            }, 1000);
        },

        videoEnded: function () {
            return Math.round(this.video.currentTime) === Math.round(this.video.duration);
        },

        buffering: function (event) {
            console.log(event.buffering);
            this.isBuffering = event.buffering;
        },

        trackChanged: function (event) {
            var _this = this;
            var tracks = this.shakaPlayer.getVariantTracks();
            _this.selectedTrack = this.activeTrack();
            console.log(_this.selectedTrack);
        },

        activeTrack: function () {
            var activeTrackIndex = null;
            var tracks = this.shakaPlayer.getVariantTracks();
            tracks.map(function (track, index) {
                if (!track.active) return;
                activeTrackIndex = index;
            });
            return activeTrackIndex;
        },

        playPause: function () {

            if (this.video.paused || this.videoEnded()) {

                // Start from beginning if video ended.
                if (this.videoEnded()) this.video.currentTime = 0;

                this.status = 'playing';
                this.video.play();

                this.handle = this.handleProgress();

                return;
            }

            if (!this.video.paused) {
                this.status = 'stopped';
                this.video.pause();

                clearInterval(this.handle);

                return;
            }

        },

        seek: function (event, ui) {
            this.video.currentTime = ui.value;
        },

        volume: function (event, ui) {
            this.video.volume = ui.value;
        },

        fullScreen: function () {
            var videoPlayerElement = this.$refs.videoPlayer;
            if (videoPlayerElement.mozRequestFullScreen) {
                videoPlayerElement.mozRequestFullScreen();
            } else if (videoPlayerElement.webkitRequestFullScreen) {
                videoPlayerElement.webkitRequestFullScreen();
            }
        },

        normalScreen: function () {
            if (document.mozCancelFullScreen) {
                document.mozCancelFullScreen();
            } else if (document.webkitExitFullscreen) {
                document.webkitExitFullscreen();
            }
        },

        setTrack: function (event) {
            var track = this.videoTracks[event.target.value];
            if (!track) return;

            try {
                this.shakaPlayer.configure({ abr: { enabled: false } });
                this.shakaPlayer.selectVariantTrack(track)
                this.selectedTrack = this.activeTrack();
            } catch (err) {
                console.error('Error while changing track' + err);
            }
        }
    }
})
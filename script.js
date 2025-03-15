// Configurações do Spotify
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const SPOTIFY_CLIENT_ID = '78dbb42de6a1458fa7cc9344d087a1e7';
const SPOTIFY_REDIRECT_URI = isDevelopment 
    ? 'http://127.0.0.1:5500/'
    : 'https://carloseduardo029.github.io/parameuamor/';
const START_DATE = '2024-03-09';
const LAST_UPDATE = '2025-03-15 01:46:05';

class SpotifyManager {
    constructor() {
        this.accessToken = null;
        this.playlistId = '6dT06GvZrdXbETGPSsWmIR';
        this.isPlaying = false;
        this.currentTrack = null;
        this.player = null;
        this.deviceId = null;
    }

    generateAuthUrl() {
        const scope = 'streaming user-read-private user-read-playback-state user-modify-playback-state playlist-read-private';
        
        // Limpa qualquer token anterior
        localStorage.removeItem('spotify_access_token');
        
        return `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&redirect_uri=${encodeURIComponent(SPOTIFY_REDIRECT_URI)}&scope=${encodeURIComponent(scope)}&response_type=token&show_dialog=false`;
    }

    async initialize() {
        console.log('Iniciando inicialização...');
        
        // Primeiro, tenta obter o token do localStorage
        this.accessToken = localStorage.getItem('spotify_access_token');
        
        // Se não houver token no localStorage, verifica o hash da URL
        if (!this.accessToken) {
            const hash = window.location.hash.substring(1);
            const params = new URLSearchParams(hash);
            this.accessToken = params.get('access_token');
            
            if (this.accessToken) {
                // Se encontrou um token no hash, salva no localStorage
                localStorage.setItem('spotify_access_token', this.accessToken);
                // Limpa o hash da URL
                history.pushState("", document.title, window.location.pathname);
            }
        }

        // Se ainda não tiver token, redireciona para autenticação
        if (!this.accessToken) {
            console.log('Token não encontrado, redirecionando para autenticação...');
            window.location.href = this.generateAuthUrl();
            return;
        }

        console.log('Token encontrado, verificando validade...');
        
        // Verifica se o token é válido
        try {
            const response = await fetch('https://api.spotify.com/v1/me', {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!response.ok) {
                console.log('Token inválido, redirecionando para nova autenticação...');
                localStorage.removeItem('spotify_access_token');
                window.location.href = this.generateAuthUrl();
                return;
            }

            console.log('Token válido, inicializando player...');
            await this.initializePlayer();
            await this.loadPlaylist();
            
        } catch (error) {
            console.error('Erro ao verificar token:', error);
            localStorage.removeItem('spotify_access_token');
            window.location.href = this.generateAuthUrl();
        }
    }

    initializePlayer() {
        return new Promise((resolve) => {
            window.onSpotifyWebPlaybackSDKReady = () => {
                console.log('SDK do Spotify carregado');
                
                this.player = new Spotify.Player({
                    name: 'Nossa Playlist Web Player',
                    getOAuthToken: cb => { cb(this.accessToken); },
                    volume: 0.5
                });

                this.player.addListener('initialization_error', ({ message }) => {
                    console.error('Erro de inicialização:', message);
                });

                this.player.addListener('authentication_error', ({ message }) => {
                    console.error('Erro de autenticação:', message);
                    localStorage.removeItem('spotify_access_token');
                    window.location.href = this.generateAuthUrl();
                });

                this.player.addListener('account_error', ({ message }) => {
                    alert('É necessário ter Spotify Premium para reproduzir músicas diretamente no site');
                });

                this.player.addListener('playback_error', ({ message }) => {
                    console.error('Erro de reprodução:', message);
                });

                this.player.addListener('ready', ({ device_id }) => {
                    console.log('Player Web pronto!');
                    this.deviceId = device_id;
                    resolve();
                });

                this.player.addListener('not_ready', ({ device_id }) => {
                    console.log('Device ID não está mais pronto:', device_id);
                });

                console.log('Conectando ao player...');
                this.player.connect().then(success => {
                    if (success) {
                        console.log('Player conectado com sucesso!');
                    } else {
                        console.log('Falha ao conectar o player');
                    }
                });
            };
        });
    }


    async loadPlaylist() {
        try {
            const response = await fetch(`https://api.spotify.com/v1/playlists/${this.playlistId}/tracks`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Falha ao carregar playlist');
            }

            const data = await response.json();
            this.renderPlaylist(data.items);
        } catch (error) {
            console.error('Erro ao carregar playlist:', error);
            if (error.status === 401) {
                window.location.href = this.generateAuthUrl();
            }
        }
    }

    renderPlaylist(tracks) {
        const musicList = document.querySelector('.music-list');
        if (!musicList) return;

        musicList.innerHTML = '';

        tracks.forEach(track => {
            if (track.track) {
                const musicItem = this.createMusicItem(track.track);
                musicList.appendChild(musicItem);
            }
        });
    }

    createMusicItem(track) {
        const div = document.createElement('div');
        div.className = 'music-item';
        div.innerHTML = `
            <div class="music-thumbnail">
                <img src="${track.album.images[0].url}" alt="${track.album.name}">
            </div>
            <div class="music-info">
                <h3 class="song-title">${track.name}</h3>
                <p class="artist">${track.artists.map(artist => artist.name).join(', ')}</p>
                <p class="album">${track.album.name}</p>
            </div>
            <div class="music-controls">
                <i class="fas fa-play" data-track-uri="${track.uri}"></i>
            </div>
        `;

        const playButton = div.querySelector('.fa-play');
        playButton.addEventListener('click', (e) => this.togglePlay(e, track));

        return div;
    }

    updatePlaybackState(state) {
        if (!state || !state.track_window || !state.track_window.current_track) return;

        const playingTrackUri = state.track_window.current_track.uri;
        document.querySelectorAll('.music-controls i').forEach(icon => {
            const trackUri = icon.getAttribute('data-track-uri');
            if (trackUri === playingTrackUri) {
                icon.classList.replace(state.paused ? 'fa-pause' : 'fa-play', 
                                    state.paused ? 'fa-play' : 'fa-pause');
            } else {
                icon.classList.replace('fa-pause', 'fa-play');
            }
        });
    }

    async togglePlay(event, track) {
        event.stopPropagation();
        const button = event.target;

        try {
            if (this.currentTrack === track.uri && this.isPlaying) {
                await this.player.pause();
                button.classList.replace('fa-pause', 'fa-play');
                this.isPlaying = false;
            } else {
                if (!this.deviceId) {
                    alert('Aguarde o player inicializar...');
                    return;
                }

                await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`, {
                    method: 'PUT',
                    headers: {
                        'Authorization': `Bearer ${this.accessToken}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        uris: [track.uri]
                    })
                });

                document.querySelectorAll('.music-controls i').forEach(icon => {
                    icon.classList.replace('fa-pause', 'fa-play');
                });

                button.classList.replace('fa-play', 'fa-pause');
                this.currentTrack = track.uri;
                this.isPlaying = true;
            }
        } catch (error) {
            console.error('Erro ao controlar reprodução:', error);
            if (error.status === 404 || error.status === 403) {
                alert('Por favor, certifique-se de ter uma conta Spotify Premium');
            }
        }
    }
}

function calculateDaysTogether() {
    const start = new Date(START_DATE);
    const today = new Date();
    const diffTime = Math.abs(today - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function calculateHeartBeats() {
    const start = new Date(START_DATE);
    const now = new Date();
    const diffTime = Math.abs(now - start);
    const diffMinutes = Math.ceil(diffTime / (1000 * 60));
    return diffMinutes * 70;
}

function updateCounters() {
    const daysElement = document.getElementById('days-together');
    const heartBeatsElement = document.getElementById('heart-beats');

    if (daysElement) daysElement.textContent = calculateDaysTogether();
    if (heartBeatsElement) heartBeatsElement.textContent = calculateHeartBeats().toLocaleString();
}

function setupVisualEffects() {
    const heroSection = document.querySelector('.hero-section');
    if (heroSection) {
        window.addEventListener('scroll', () => {
            const scrolled = window.pageYOffset;
            heroSection.style.backgroundPositionY = `${scrolled * 0.5}px`;
        });
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.timeline-item, .gallery-item, .letter')
        .forEach(element => observer.observe(element));
}

function setupMobileNav() {
    const nav = document.querySelector('.navigation');
    const menuButton = document.createElement('button');
    menuButton.className = 'mobile-menu-button';
    menuButton.innerHTML = '<i class="fas fa-bars"></i>';

    if (nav) {
        const ul = nav.querySelector('ul');
        
        if (window.innerWidth <= 768) {
            nav.insertBefore(menuButton, ul);
            ul.style.display = 'none';
        }

        menuButton.addEventListener('click', () => {
            ul.style.display = ul.style.display === 'none' ? 'flex' : 'none';
        });

        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) {
                ul.style.display = 'flex';
                if (nav.contains(menuButton)) {
                    nav.removeChild(menuButton);
                }
            } else {
                if (!nav.contains(menuButton)) {
                    nav.insertBefore(menuButton, ul);
                }
                ul.style.display = 'none';
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const spotifyManager = new SpotifyManager();
    spotifyManager.initialize();

    setupVisualEffects();
    setupMobileNav();
    updateCounters();

    setInterval(updateCounters, 60000);

    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});

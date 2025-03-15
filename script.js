// Configurações do Spotify
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const SPOTIFY_CLIENT_ID = '78dbb42de6a1458fa7cc9344d087a1e7';
const SPOTIFY_REDIRECT_URI = isDevelopment 
    ? 'http://127.0.0.1:5500/'
    : 'https://carloseduardo029.github.io/parameuamor/';
const START_DATE = '2024-03-09';

class SpotifyManager {
    constructor() {
        this.accessToken = null;
        this.playlistId = '6dT06GvZrdXbETGPSsWmIR';
    }

    generateAuthUrl() {
        const scope = 'playlist-read-private';
        return `https://accounts.spotify.com/authorize?client_id=${SPOTIFY_CLIENT_ID}&redirect_uri=${encodeURIComponent(SPOTIFY_REDIRECT_URI)}&scope=${encodeURIComponent(scope)}&response_type=token`;
    }

    async initialize() {
        console.log('Iniciando...');
        
        // Verifica se já temos um token
        this.accessToken = localStorage.getItem('spotify_access_token');
        
        // Se não tiver no localStorage, procura na URL
        if (!this.accessToken) {
            const hash = window.location.hash.substring(1);
            const params = new URLSearchParams(hash);
            this.accessToken = params.get('access_token');
            
            if (this.accessToken) {
                localStorage.setItem('spotify_access_token', this.accessToken);
                history.pushState("", document.title, window.location.pathname);
            }
        }

        // Se ainda não tiver token, redireciona para autenticação
        if (!this.accessToken) {
            console.log('Token não encontrado, redirecionando...');
            window.location.href = this.generateAuthUrl();
            return;
        }

        // Carrega a playlist
        await this.loadPlaylist();
    }

    async loadPlaylist() {
        try {
            console.log('Carregando playlist...');
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
                localStorage.removeItem('spotify_access_token');
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
                <a href="${track.external_urls.spotify}" target="_blank">
                    <i class="fas fa-play"></i>
                </a>
            </div>
        `;

        return div;
    }
}

// Funções para os contadores
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

// Efeitos visuais
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

// Navegação mobile
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

// Inicialização
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

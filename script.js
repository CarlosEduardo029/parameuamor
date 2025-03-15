// Configurações do Spotify
const isDevelopment = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const SPOTIFY_CLIENT_ID = '78dbb42de6a1458fa7cc9344d087a1e7';
const SPOTIFY_REDIRECT_URI = isDevelopment 
    ? 'http://127.0.0.1:5500/'
    : 'https://carloseduardo029.github.io/parameuamor/';
const START_DATE = '2024-03-09';
const LAST_UPDATE = '2025-03-15 02:04:01';

class SpotifyManager {
    constructor() {
        this.accessToken = null;
        this.playlistId = '6dT06GvZrdXbETGPSsWmIR';
    }

    generateAuthUrl() {
        // Limpa qualquer token antigo
        localStorage.removeItem('spotify_access_token');
        
        const scope = 'playlist-read-private';
        const state = this.generateRandomString(16);
        
        // Salva o estado para verificação
        sessionStorage.setItem('spotify_auth_state', state);

        const params = new URLSearchParams({
            response_type: 'token',
            client_id: SPOTIFY_CLIENT_ID,
            scope: scope,
            redirect_uri: SPOTIFY_REDIRECT_URI,
            state: state,
            show_dialog: true
        });

        return 'https://accounts.spotify.com/authorize?' + params.toString();
    }

    generateRandomString(length) {
        const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let text = '';
        for (let i = 0; i < length; i++) {
            text += possible.charAt(Math.floor(Math.random() * possible.length));
        }
        return text;
    }

    async validateToken() {
        try {
            const response = await fetch('https://api.spotify.com/v1/me', {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            return response.ok;
        } catch (error) {
            console.error('Erro ao validar token:', error);
            return false;
        }
    }

    async initialize() {
        try {
            console.log('Iniciando processo de autenticação...');

            // Primeiro tenta pegar o token do localStorage
            this.accessToken = localStorage.getItem('spotify_access_token');

            // Se não encontrou no localStorage, procura na URL
            if (!this.accessToken) {
                console.log('Token não encontrado no localStorage, verificando URL...');
                const hash = window.location.hash.substring(1);
                const params = new URLSearchParams(hash);
                this.accessToken = params.get('access_token');

                if (this.accessToken) {
                    console.log('Token encontrado na URL, salvando...');
                    localStorage.setItem('spotify_access_token', this.accessToken);
                    // Limpa a URL
                    window.location.hash = '';
                }
            }

            // Se ainda não tem token, redireciona para autenticação
            if (!this.accessToken) {
                console.log('Token não encontrado, redirecionando para autenticação...');
                window.location.href = this.generateAuthUrl();
                return;
            }

            // Valida o token
            console.log('Validando token...');
            const isValid = await this.validateToken();

            if (!isValid) {
                console.log('Token inválido, redirecionando para nova autenticação...');
                localStorage.removeItem('spotify_access_token');
                window.location.href = this.generateAuthUrl();
                return;
            }

            console.log('Token válido, carregando playlist...');
            await this.loadPlaylist();

        } catch (error) {
            console.error('Erro durante inicialização:', error);
            localStorage.removeItem('spotify_access_token');
            window.location.href = this.generateAuthUrl();
        }
    }

    async loadPlaylist() {
        try {
            console.log('Fazendo requisição para a API do Spotify...');
            const response = await fetch(`https://api.spotify.com/v1/playlists/${this.playlistId}/tracks`, {
                headers: {
                    'Authorization': `Bearer ${this.accessToken}`
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Playlist carregada com sucesso!');
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
        if (!musicList) {
            console.error('Elemento .music-list não encontrado!');
            return;
        }

        console.log(`Renderizando ${tracks.length} músicas...`);
        musicList.innerHTML = '';

        tracks.forEach((item, index) => {
            if (item.track) {
                const musicItem = this.createMusicItem(item.track, index);
                musicList.appendChild(musicItem);
            }
        });
    }

    createMusicItem(track, index) {
        const div = document.createElement('div');
        div.className = 'music-item';
        
        // Verifica se todas as propriedades necessárias existem
        const imageUrl = track.album?.images[0]?.url || '';
        const albumName = track.album?.name || 'Album desconhecido';
        const trackName = track.name || 'Música desconhecida';
        const artistNames = track.artists?.map(artist => artist.name).join(', ') || 'Artista desconhecido';
        const spotifyUrl = track.external_urls?.spotify || '#';

        div.innerHTML = `
            <div class="music-thumbnail">
                <img src="${imageUrl}" alt="${albumName}" onerror="this.src='caminho/para/imagem/padrao.jpg'">
            </div>
            <div class="music-info">
                <h3 class="song-title">${trackName}</h3>
                <p class="artist">${artistNames}</p>
                <p class="album">${albumName}</p>
            </div>
            <div class="music-controls">
                <a href="${spotifyUrl}" target="_blank" rel="noopener noreferrer">
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
    console.log('Página carregada, iniciando aplicação...');
    
    const spotifyManager = new SpotifyManager();
    spotifyManager.initialize().catch(error => {
        console.error('Erro fatal durante inicialização:', error);
    });

    setupVisualEffects();
    setupMobileNav();
    updateCounters();

    setInterval(updateCounters, 60000);

    // Smooth scroll
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

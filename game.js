document.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');

    // --- DOM Elements ---
    const startScreen = document.getElementById('startScreen');
    const gameOverScreen = document.getElementById('gameOverScreen');
    const easyBtn = document.getElementById('easyBtn');
    const mediumBtn = document.getElementById('mediumBtn');
    const hardBtn = document.getElementById('hardBtn');
    const restartBtn = document.getElementById('restartBtn');
    const muteBtn = document.getElementById('muteBtn');
    const finalScoreEl = document.getElementById('finalScore');
    const newHighScoreEl = document.getElementById('newHighScore');
    const highScoreDisplay = document.getElementById('highScoreDisplay');

    // --- Game State ---
    let gameRunning = false;
    let currentDifficulty = 'medium';
    let score = 0;
    let highScore = localStorage.getItem('highScore') || 0;
    let bullets = [];
    let enemies = [];
    let keys = {};
    let player;
    let enemySpawnInterval;
    let animationFrameId;
    let isMuted = false;

    // --- Game Configuration ---
    const difficultySettings = {
        easy: { enemySpeed: 2, spawnRate: 1500 },
        medium: { enemySpeed: 4, spawnRate: 1000 },
        hard: { enemySpeed: 6, spawnRate: 600 }
    };

    // --- Asset Loading ---
    const playerImg = new Image();
    playerImg.src = 'player.png';

    const enemyImg = new Image();
    enemyImg.src = 'animal.png';

    const bulletImg = new Image();
    bulletImg.src = 'boulet.png';

    // --- Sound & Voice Effects ---
    const sounds = {
        shoot: new Audio('gun-fire-346766.mp3'),
        hit: new Audio('https://cdn.freesound.org/previews/344/344290_5121236-lq.mp3'),
        gameOver: new Audio('https://cdn.freesound.org/previews/456/456965_5121236-lq.mp3'),
        gameStart: new Audio('https://cdn.freesound.org/previews/391/391659_5121236-lq.mp3')
    };

    function playSound(sound) {
        if (!isMuted) {
            sounds[sound].currentTime = 0;
            sounds[sound].play();
        }
    }

    function stopAllSounds() {
        Object.values(sounds).forEach(audio => {
            audio.pause();
            audio.currentTime = 0;
        });
    }

    // --- Player Class ---
    class Player {
        constructor() {
            this.width = 50;
            this.height = 50;
            this.x = canvas.width / 2 - this.width / 2;
            this.y = canvas.height - this.height - 10;
            this.speed = 5;
            this.facingDirection = 'right'; // 'left' or 'right'
            this.health = 100;
            this.lives = 3;
        }

        draw() {
            ctx.save();
            if (this.facingDirection === 'left') {
                ctx.scale(-1, 1);
                ctx.drawImage(playerImg, -this.x - this.width, this.y, this.width, this.height);
            } else {
                ctx.drawImage(playerImg, this.x, this.y, this.width, this.height);
            }
            ctx.restore();
        }

        update() {
            if (keys['ArrowLeft'] && this.x > 0) {
                this.x -= this.speed;
                this.facingDirection = 'left';
            }
            if (keys['ArrowRight'] && this.x < canvas.width - this.width) {
                this.x += this.speed;
                this.facingDirection = 'right';
            }
        }
    }

    // --- Bullet Class ---
    class Bullet {
        constructor(x, y, facingDirection) {
            this.width = 5;
            this.height = 15;
            this.x = x;
            this.y = y;
            this.speed = 10;
            this.facingDirection = facingDirection;
        }

        draw() {
            ctx.drawImage(bulletImg, this.x, this.y, this.width, this.height);
        }

        update() {
            this.y -= this.speed;
        }
    }

    // --- Enemy Class ---
    class Enemy {
        constructor() {
            this.width = 40;
            this.height = 40;
            this.x = Math.random() * (canvas.width - this.width);
            this.y = -this.height;
            this.speed = difficultySettings[currentDifficulty].enemySpeed;
        }

        draw() {
            ctx.drawImage(enemyImg, this.x, this.y, this.width, this.height);
        }

        update() {
            this.y += this.speed;
        }
    }

    // --- Game Loop ---
    function gameLoop() {
        if (!gameRunning) return;

        update();
        draw();

        animationFrameId = requestAnimationFrame(gameLoop);
    }

    // --- Update Function ---
    function update() {
        player.update();

        // Update bullets
        for (let i = bullets.length - 1; i >= 0; i--) {
            bullets[i].update();
            if (bullets[i].y < 0) {
                bullets.splice(i, 1);
            }
        }

        // Update enemies
        for (let i = enemies.length - 1; i >= 0; i--) {
            enemies[i].update();
            if (enemies[i].y > canvas.height) {
                enemies.splice(i, 1);
                player.lives--;
                if (player.lives <= 0) {
                    gameOver();
                }
            }
        }

        // Collision detection
        handleCollisions();
    }

    // --- Draw Function ---
    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        player.draw();

        bullets.forEach(bullet => bullet.draw());
        enemies.forEach(enemy => enemy.draw());

        // Draw score, lives, and health
        ctx.fillStyle = 'white';
        ctx.font = '20px Arial';
        ctx.fillText(`Score: ${score}`, 10, 30);
        ctx.fillText(`Lives: ${player.lives}`, 10, 60);
        ctx.fillText(`Health: ${player.health}%`, 10, 90);
    }

    // --- Collision Handling ---
    function handleCollisions() {
        // Bullets and enemies
        for (let i = bullets.length - 1; i >= 0; i--) {
            for (let j = enemies.length - 1; j >= 0; j--) {
                if (
                    bullets[i] && enemies[j] &&
                    bullets[i].x < enemies[j].x + enemies[j].width &&
                    bullets[i].x + bullets[i].width > enemies[j].x &&
                    bullets[i].y < enemies[j].y + enemies[j].height &&
                    bullets[i].y + bullets[i].height > enemies[j].y
                ) {
                    bullets.splice(i, 1);
                    enemies.splice(j, 1);
                    score += 10;
                    playSound('hit');
                }
            }
        }

        // Player and enemies
        for (let i = enemies.length - 1; i >= 0; i--) {
            if (
                player.x < enemies[i].x + enemies[i].width &&
                player.x + player.width > enemies[i].x &&
                player.y < enemies[i].y + enemies[i].height &&
                player.y + player.height > enemies[i].y
            ) {
                enemies.splice(i, 1); // Remove enemy after collision
                player.health -= 20;
                if (player.health <= 0) {
                    player.lives--;
                    if (player.lives <= 0) {
                        gameOver();
                    } else {
                        player.health = 100; // Reset health
                    }
                }
            }
        }
    }

    // --- Enemy Spawning ---
    function startEnemySpawning() {
        console.log("Enemy spawning started");
        const spawnRate = difficultySettings[currentDifficulty].spawnRate;
        if (enemySpawnInterval) clearInterval(enemySpawnInterval);
        enemySpawnInterval = setInterval(() => {
            if (gameRunning) {
                enemies.push(new Enemy());
            }
        }, spawnRate);
    }

    // --- Game Start ---
    function startGame(difficulty) {
        console.log(`Difficulty button clicked: ${difficulty}`);
        console.log("startGame() called");

        currentDifficulty = difficulty;
        score = 0;
        bullets = [];
        enemies = [];
        gameRunning = true;

        player = new Player();

        startScreen.style.display = 'none';
        gameOverScreen.style.display = 'none';
        canvas.style.display = 'block';

        playSound('gameStart');
        startEnemySpawning();
        if (!animationFrameId) {
            gameLoop();
        }
        console.log(`gameRunning is now: ${gameRunning}`);
    }

    // --- Game Over ---
    function gameOver() {
        gameRunning = false;
        stopAllSounds();
        if (enemySpawnInterval) clearInterval(enemySpawnInterval);
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        animationFrameId = null;

        if (score > highScore) {
            highScore = score;
            localStorage.setItem('highScore', highScore);
            newHighScoreEl.style.display = 'block';
        } else {
            newHighScoreEl.style.display = 'none';
        }

        finalScoreEl.textContent = `Your Score: ${score}`;
        highScoreDisplay.textContent = `High Score: ${highScore}`;
        canvas.style.display = 'none';
        gameOverScreen.style.display = 'block';
    }

    // --- Event Listeners ---
    easyBtn.addEventListener('click', () => startGame('easy'));
    mediumBtn.addEventListener('click', () => startGame('medium'));
    hardBtn.addEventListener('click', () => startGame('hard'));
    restartBtn.addEventListener('click', () => {
        gameOverScreen.style.display = 'none';
        startScreen.style.display = 'block';
        updateHighScoreDisplay();
    });

    muteBtn.addEventListener('click', () => {
        isMuted = !isMuted;
        muteBtn.textContent = isMuted ? 'Unmute' : 'Mute';
    });

    window.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        if (e.code === 'Space' && gameRunning) {
            const bulletX = player.x + player.width / 2 - 2.5;
            const bulletY = player.y;
            bullets.push(new Bullet(bulletX, bulletY, player.facingDirection));
            playSound('shoot');
        }
    });

    window.addEventListener('keyup', (e) => {
        keys[e.code] = false;
    });

    // --- Initialization ---
    function init() {
        canvas.width = 800;
        canvas.height = 600;
        updateHighScoreDisplay();
    }

    function updateHighScoreDisplay() {
        highScoreDisplay.textContent = `High Score: ${highScore}`;
    }

    init();
});

import MainScene from "./scenes/mainScene.js";

const config = {
    type: Phaser.AUTO,
    width: 800,
    height: 600,
    scene: MainScene,
    backgroundColor: '#FFFFFF',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
};

new Phaser.Game(config);
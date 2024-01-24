// The MenuManager class handles the displaying of the menu for this small game.
// This allows the mainScene class to not be concerned with exactly how the menu
// is constructed. The createMenu method has also been made somewhat customizable so 
// that the mainScene can pass through different texts to display if necessary. 
export class MenuManager {
    constructor(scene) {
        this.scene = scene;
    }

    createMenu(subtitleText, subtitle2Text, buttonText) {
        const centerX = this.scene.cameras.main.centerX;
        const centerY = this.scene.cameras.main.centerY;

        let menuGraphics = this.scene.add.graphics({ fillStyle: { color: 0x0000ff, alpha: 0.6 } });
        menuGraphics.fillRect(centerX - 100, centerY - 100, 200, 200);

        let titleText = this.scene.add.text(centerX, centerY - 70, 'DOTS!', { fontSize: '32px', fill: '#FFFFFF' }).setOrigin(0.5);
        let subTitleText = this.scene.add.text(centerX, centerY - 25, subtitleText, { fontSize: '16px', fill: '#FFFFFF' }).setOrigin(0.5);
        let subTitle2Text = this.scene.add.text(centerX, centerY + 5, subtitle2Text, { fontSize: '16px', fill: '#FFFFFF' }).setOrigin(0.5);
        let startButtonText = this.scene.add.text(centerX, centerY + 50, buttonText, { fontSize: '24px', fill: '#FFFFFF' }).setOrigin(0.5);

        startButtonText.setInteractive({ useHandCursor: true });
        startButtonText.on('pointerdown', () => {
            this.scene.startGame();
            menuGraphics.clear();
            titleText.destroy();
            subTitleText.destroy();
            subTitle2Text.destroy();
            startButtonText.destroy();
            exitButtonText.destroy();
        });
        startButtonText.on('pointerover', () => startButtonText.setStyle({ fill: '#ff0' }));
        startButtonText.on('pointerout', () => startButtonText.setStyle({ fill: '#FFFFFF' }));

        let exitButtonText = this.scene.add.text(centerX, centerY + 80, 'Exit', { fontSize: '24px', fill: '#FFFFFF' }).setOrigin(0.5);
        exitButtonText.setInteractive({ useHandCursor: true });
        exitButtonText.on('pointerdown', () => {
            this.scene.game.destroy(true);
        });
        exitButtonText.on('pointerover', () => exitButtonText.setStyle({ fill: '#ff0' }));
        exitButtonText.on('pointerout', () => exitButtonText.setStyle({ fill: '#FFFFFF' }));

    }
}
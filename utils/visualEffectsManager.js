import * as Constants from '../constants/constants.js';

// The VisualEffectsManager class handles all of the visual effects and tweened movements 
// that are done by game and visual objects. This class is used by the mainScene class so that
// it does not need to be concerned with how the visual effects are being constructed. It also 
// allows the VFXManager class to contain all of the information that only it needs to have, 
// clearing up the mainScene.
export class VisualEffectsManager {
    constructor(scene) {
        this.scene = scene;
        this.emitters = {};
        this.borderGraphics = this.scene.add.graphics({ lineStyle: { width: 4, color: 0x000000 } });
        this.chainLineGraphics = this.scene.add.graphics({ lineStyle: { width: 4, color: 0x000000 } });
        this.pointerLineGraphics = this.scene.add.graphics({ lineStyle: { width: 4, color: 0x000000 } });
        this.staticBorderGraphics = this.scene.add.graphics(({ lineStyle: { width: 2, color: 0x000000 } }));
        this.addGameBorder();
    }

    addGameBorder() {
        const borderThickness = 2;
        this.staticBorderGraphics.clear();
        this.staticBorderGraphics.strokeRect(
            borderThickness / 2,
            borderThickness / 2,
            Constants.GAME_WIDTH - 2,
            Constants.GAME_HEIGHT - 2
        );
    }

    // This function creates a pulse visual effect centered at the location of the 'circle' parameter.
    // This function is called when the circle is selected to add to the active chain.
    createPulseEffect(circle) {
        // Create a graphics object for the pulse
        let pulse = this.scene.add.graphics({ x: circle.x, y: circle.y });
        pulse.fillStyle(circle.color, 1);
        pulse.fillCircle(0, 0, circle.radius);

        this.scene.tweens.add({
            targets: pulse,
            scale: 2, 
            alpha: 0,
            duration: 400,
            ease: 'Linear',
            onComplete: () => {
                pulse.destroy(); // Remove the pulse after animation
            }
        });
    }

    // This function shrinks the circle until it is no longer visible. This is called on each circle when 
    // it is removed from the game board.
    shrinkCircle(circle, onCompleteCallback) {
        this.scene.tweens.add({
            targets: circle,
            scale: 0,
            alpha: 1,
            duration: 200,
            ease: 'Linear',
            onComplete: () => {
                circle.destroy();
                if (onCompleteCallback) {
                    onCompleteCallback();
                }
            }
        });
    }

    // This function retreives the firework particles from the emitters map if it exists
    // if it does not exist it creates a new texture based on the 'color' parameter,
    // creates a new particleEmitter, and saves it in the emitters map. 
    getFireworkParticles(color) {
        // Generate a unique key for the texture based on the color
        const textureKey = 'circleParticle_' + color.toString(16);

        // Check if an emitter for this color already exists
        if (!this.emitters[textureKey]) {
            // Create a new texture for the particle
            let particleGraphics = this.scene.add.graphics();
            particleGraphics.fillStyle(color, 1);
            particleGraphics.fillCircle(2, 2, 2);
            particleGraphics.generateTexture(textureKey, 4, 4);
            particleGraphics.destroy();

            // Create a new emitter with this texture
            this.emitters[textureKey] = this.scene.add.particles(0, 0, textureKey, {
                lifespan: 500,
                speed: { min: 20, max: 90 },
                angle: { min: 0, max: 360 },
                scale: { start: 2, end: 0 },
                rotate: { start: 0, end: 360 },
                quantity: 70,
                emitting: false
            });
        }
        return this.emitters[textureKey];
    }

    createFireworkParticles(circle) {
        const emitter = this.getFireworkParticles(circle.color);
        emitter.emitParticleAt(circle.x, circle.y);
    }

    // This function is called whenever the player succesfully captures any number of
    // circles. It animates a scoring messages that travels between the temporary 
    // scoring display and their running point total.
    scoringPointsAnimation(pointsToAdd, color) {
        const scoringAnimation = this.scene.add.text(
            (Constants.GAME_WIDTH) / 2,
            Constants.GAME_HEIGHT - 55,
            `+ ${pointsToAdd}!`,
            { fontSize: '16px', fill: `#${color.toString(16)}`, alpha: 1 }
        );
        scoringAnimation.setX((Constants.GAME_WIDTH - scoringAnimation.width) / 2)

        this.scene.tweens.add({
            targets: scoringAnimation,
            y: scoringAnimation.y + 20, 
            alpha: 0, 
            duration: 500,
            ease: 'Quadratic.In',
            onComplete: () => {
                scoringAnimation.destroy();
            }
        });
    }

    // This function is called on each new circle when it is added to the game board.
    // It creates a tween per number of 'spaceToMove'. The 'startingIndex' is used to
    // determine where the circle will start in the gameBoard. The last space the circle
    // has to move has an additional two tweens to simulate the circle bouncing and 
    // coming to rest.
    createAndPlayFallingTweens(circle, spacesToMove, startingIndex) {
        const tweens = []
        let curXValue = circle.x;
        let curYValue = circle.y;
        let duration = 150;
        for (var i = startingIndex; i < startingIndex + spacesToMove; i++) {
            curXValue += (i % 2 === 0 ? -Constants.CELL_SIZE / 2 : Constants.CELL_SIZE / 2);
            curYValue += Constants.CELL_SIZE;
            tweens.push({
                y: curYValue,
                x: curXValue,
                duration: duration,
                ease: 'Linear'
            })
            duration *= 0.9;
            if (i === startingIndex + spacesToMove - 1) {
                tweens.push({
                    y: curYValue - 4,
                    x: curXValue,
                    duration: 50,
                    ease: 'Quadratic'
                })
                tweens.push({
                    y: curYValue,
                    x: curXValue,
                    duration: 50,
                    ease: 'Quadratic'
                })
            }
        }
        let tweenChain = this.scene.tweens.chain({
            targets: circle,
            tweens: tweens
        });
        tweenChain.play();
    }

    // The function is called when a circle is added or removed from the chain. It 
    // draws the lines between each circle in the chain.
    updateChainLines() {
        this.chainLineGraphics.clear();
        if (this.scene.selectedCircles.length > 1) {
            // Draw lines between circles in the chain
            for (let i = 0; i < this.scene.selectedCircles.length - 1; i++) {
                const circle1 = this.scene.selectedCircles[i];
                const circle2 = this.scene.selectedCircles[i + 1];
                this.chainLineGraphics.lineStyle(4, circle1.color);
                this.chainLineGraphics.lineBetween(circle1.x, circle1.y, circle2.x, circle2.y);
            }
        }
    }

    // The function is called when the player moves their cursor. It draws a line between the 
    // cursor and the most recently selected circle (as long as there is one)
    updatePointerLines(pointer) {
        if (this.scene.selectedCircles.length > 0) {
            // Draw line from last circle to cursor
            const lastCircle = this.scene.selectedCircles[this.scene.selectedCircles.length - 1];
            if (pointer) {
                this.pointerLineGraphics.clear();
                this.pointerLineGraphics.lineStyle(4, lastCircle.color);
                this.pointerLineGraphics.lineBetween(lastCircle.x, lastCircle.y, pointer.x, pointer.y);
            }
        }
    }

    clearAllGraphics() {
        this.borderGraphics.clear();
        this.chainLineGraphics.clear();
        this.pointerLineGraphics.clear();
    }

    // The function is called whenever the player adds or removes a circle from their chain. 
    // It calculates the ratio of the players current chain and the BONUS_CHAIN_LENGTH (any chain
    // longer than the value of that constant is worth x2 points). This is a visual representation 
    // of how close they are to achieving that goal. This function draws a line on each of the four 
    // borders starting at the center of the associated border.
    updateBorder() {
        this.borderGraphics.clear();

        const chainLength = this.scene.loopCreated
            ? this.scene.allSimilarColorCircles.length
            : this.scene.selectedCircles.length;
        if (this.scene.selectedCircles.length > 0) {
            let borderColor = this.scene.selectedCircles[0].color;
            this.borderGraphics.fillStyle(borderColor);

            // Calculate the proportion of the border to fill
            let proportion = Math.min(chainLength / Constants.BONUS_CHAIN_LENGTH, 1);

            // Calculate fill lengths
            let horizontalFillLength = proportion * Constants.GAME_WIDTH / 2;
            let verticalFillLength = proportion * Constants.GAME_HEIGHT / 2;

            // Top and bottom borders
            this.borderGraphics.fillRect(Constants.GAME_WIDTH / 2 - horizontalFillLength, 0, horizontalFillLength * 2, 6);
            this.borderGraphics.fillRect(Constants.GAME_WIDTH / 2 - horizontalFillLength, Constants.GAME_HEIGHT - 6, horizontalFillLength * 2, 6);

            // Left and right borders
            this.borderGraphics.fillRect(0, Constants.GAME_HEIGHT / 2 - verticalFillLength, 6, verticalFillLength * 2);
            this.borderGraphics.fillRect(Constants.GAME_WIDTH - 6, Constants.GAME_HEIGHT / 2 - verticalFillLength, 6, verticalFillLength * 2);
        }
    }
}
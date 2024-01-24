import * as Constants from '../constants/constants.js';

// The GameStateDisplayManager handles all of the non-moving game state information during
// the runtime of the game. It displays the scoreboard, the countdown timer, as well as the
// 'pointToBeAdded' the is displayed when the player is building a chain. This class exposes
// functions to the mainScene so that it doesn't need to be concerned with exactly how the 
// information is being displayed.
export class GameStateDisplayManager {
    constructor(scene) {
        this.scene = scene;

        this.countdownText = this.scene.add.text(10, 20, '', { fontSize: '16px', fill: '#000000' });
        this.pointsToBeAddedText = this.scene.add.text(60, Constants.GAME_HEIGHT - 55, ``, { fontSize: '16px', fill: '#000000' });
        this.scoreBoardText = this.scene.add.text(100, Constants.GAME_HEIGHT - 35, '', { fontSize: '16px', fill: '#000000' });
        this.scoreBoardText.setX((Constants.GAME_WIDTH - this.scoreBoardText.width) / 2);
        this.WARNING_COLOR = 0xe84d60;
        this.warningSet = false;
    }

    // This function is called each time the player adds or removes another circle to/from their
    // chain. 'circlesInChain' is the number of circles currently in the players chain and the 
    // 'color' of the circles that are currently being captured.  
    setPointsToBeAddedText(circlesInChain, color) {
        if (color) {
            this.pointsToBeAddedText.setColor(`#${color.toString(16)}`);
        }
        if (circlesInChain <= 1) {
            this.pointsToBeAddedText.setText('');
        } else {
            if (this.scene.loopCreated && this.scene.allSimilarColorCircles !== null) {
                circlesInChain = this.scene.allSimilarColorCircles.length;
            }
            // Points are doubled if you capture 10 or more, so we want to make sure to include
            // that in this display as well!
            this.pointsToBeAddedText.setText(
                `+ ${circlesInChain}${circlesInChain >= 10 ? " X2!" : "!"}`);
        }
        this.pointsToBeAddedText.setX(
            (Constants.GAME_WIDTH - this.pointsToBeAddedText.width) / 2);
    }

    // This function is called each time the update() method is called in our main scene.
    // It updates the countdown text with the current time and updates the color during the
    // last five seconds.  
    setCountdownText(timeRemaining) {
        this.countdownText.setText(timeRemaining !== null ? 'Time: ' + timeRemaining : '');
        if (parseFloat(timeRemaining) <= 5.00 && !this.warningSet) {
            this.warningSet = true;
            this.countdownText.setColor(`#${this.WARNING_COLOR.toString(16)}`);
        }
        this.countdownText.setX((Constants.GAME_WIDTH - this.countdownText.width) / 2);
    }

    setScoreBoardText(text) {
        this.scoreBoardText.setText(text !== null ? `Score: ${text}` : '');
        this.scoreBoardText.setX((Constants.GAME_WIDTH - this.scoreBoardText.width) / 2);
    }

    clearAllText() {
        this.setCountdownText(null);
        this.countdownText.setColor(`#000000`);
        this.warningSet = false;
        this.setScoreBoardText(null);
        this.setPointsToBeAddedText(0, null);
    }
}
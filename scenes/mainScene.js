import * as Constants from '../constants/constants.js';
import { GameStateDisplayManager } from '../utils/gameStateDisplayManager.js';
import { MenuManager } from '../utils/menuManager.js';
import { VisualEffectsManager } from '../utils/visualEffectsManager.js';

// The mainScene class handles the core board logic as well as the underlying data powering
// the GameStateDisplayManager, the VisualEffectsManager, and the MenuManager. This class
// powers the entire game, but delegates works and data storage to its Manager classes. It
// only contains data necessary to it or needed by all Manager classes rather than being 
// polluted with data only needed by one Manager class.
export default class MainScene extends Phaser.Scene {
    constructor() {
        super('MyScene');
    }

    // This function is called whenever a new circle needs to be created. It sets the position
    // and determines the color of the circle. It also sets the color, gridX, and gridY 
    // attributes on the object so that they can be referenced later.
    createNewCircle(x, y, gridY) {
        const color = Phaser.Math.RND.pick(Constants.COLOR_OPTIONS.slice(0, Constants.CIRCLE_COLORS));
        let posX = (x * Constants.CELL_SIZE + Constants.CELL_SIZE / 2) + Constants.VIEW_PADDING_X - Constants.CELL_SIZE / 3;
        if (y % 2 === 0) {
            posX += Constants.CELL_SIZE / 2;
        }
        const posY = (y * Constants.CELL_SIZE + Constants.CELL_SIZE / 2) + Constants.VIEW_PADDING_Y;

        const radius = Constants.CELL_SIZE / 3;
        let circle = this.add.circle(posX, posY, radius, color);
        this.physics.add.existing(circle);
        circle.body.setCircle(radius);

        circle.color = color;
        circle.gridX = x;
        circle.gridY = gridY;
        circle.setInteractive();
        return circle;
    }

    // This function is called when the initial board is created and each time new circles
    // are added to the game board. It adds an on overlap handler method for what happens 
    // when the cursor physics body overlaps with a circle.
    addOnCollisionHandler(circles) {
        this.physics.add.overlap(this.pointerBody, circles, (pointerBody, circle) => {
            if (this.isValidNextCircle(circle)) {
                if (this.isBackTracking(circle)) {
                    this.removeCircleFromChain(circle);
                } else if (!this.selectedCircles.includes(circle) && !this.loopCreated) {
                    this.addCircleToSelectedChain(circle);
                } else if (this.selectedCircles.includes(circle) && !this.loopCreated) {
                    this.handleLoopCreated(circle);
                }
            }
        });
    };

    // This function is called whenever the pointer physics body overlaps with a circle on 
    // the game board. It determines whether this circle would be a valid next circle for the 
    // players chain of circle. This logic is determined by the ADJACENT_CIRCLE_OFFSETS_RIGHT_LEANING
    // and ADJACENT_CIRCLE_OFFSETS_LEFT_LEANING constants defined in constants.js. If valid connections
    // needed to be updated those constants are all that would need to change.
    isValidNextCircle(circle) {
        if (this.selectedCircles.length === 0) {
            return true;
        }
        const lastCircle = this.selectedCircles[this.selectedCircles.length - 1];
        const xOffset = circle.gridX - lastCircle.gridX;
        const yOffset = circle.gridY - lastCircle.gridY;
        const isValidAdjacentCircle = lastCircle.gridY % 2 === 0
            ? Constants.ADJACENT_CIRCLE_OFFSETS_RIGHT_LEANING.some(coord =>
                coord[0] === xOffset && coord[1] === yOffset)
            : Constants.ADJACENT_CIRCLE_OFFSETS_LEFT_LEANING.some(coord =>
                coord[0] === xOffset && coord[1] === yOffset);
        return isValidAdjacentCircle && lastCircle.color === circle.color;
    }

    // This function determines if the player is 'backtracking' or going back to the second most recent
    // circle they have in their chain. This is called whenever the cursor physics body overlaps with
    // a circle on the game board. 
    isBackTracking(circle) {
        if (this.selectedCircles.length <= 0) {
            return false;
        }
        return this.selectedCircles[this.selectedCircles.length - 2] === circle;
    }

    updateSelectedChainGraphics() {
        this.visualEffectsManager.updateChainLines();
        this.visualEffectsManager.updateBorder();
    }

    addCircleToSelectedChain(circle) {
        this.selectedCircles.push(circle);
        this.visualEffectsManager.createPulseEffect(circle);
        this.updatePointsToBeAdded(1, circle.color);
        this.updateSelectedChainGraphics();
    }

    removeCircleFromChain() {
        this.loopCreated = false;
        const circleToPop = this.selectedCircles.pop();
        this.updatePointsToBeAdded(-1, circleToPop.color);
        this.updateSelectedChainGraphics();
    }

    handleLoopCreated(circle) {
        this.loopCreated = true;
        this.setAllSimilarColoredCirclesToSelectedCircles(circle.color);
        this.addCircleToSelectedChain(circle);
        this.allSimilarColorCircles.forEach((circle) => {
            this.visualEffectsManager.createPulseEffect(circle);
        })
    }

    setAllSimilarColoredCirclesToSelectedCircles(color) {
        this.allSimilarColorCircles = [];
        this.board.flat().forEach((circle) => {
            if (circle.color === color) {
                this.allSimilarColorCircles.push(circle);
            }
        })
    }

    // This function is called each time circles are removed from the board. 'columnsToAdjust' is
    // a list of column indices that have had circles removed. Each column is processed and new circles
    // are created as needed.
    updateBoard(columnsToAdjust) {
        columnsToAdjust.forEach((column) => {
            let spacesToMove = 0; // The number of spaces the created circle will need to fall down to get to it's place.
            let remainingCircles = [];
            const curColumn = this.board[column];
            // This loop goes through a column from top to bottom, keeping track of the number of indices that have 
            // a null circle (these are circles that have been removed from the game board via a successful player
            // chain). At each index in the array in which there is an existing circle and that circle has indices 
            // below it that are empty, we must move the circle down exactly enough to fill the space. This loop
            // handles all of the visual effects for this process and the addNewCirclesToColumn function call below
            // handles updating the game state.
            for (var i = this.board[column].length - 1; i > -1; i--) {
                let curCircle = curColumn[i];
                if (curCircle.active === false) {
                    curColumn[i] = null;
                    spacesToMove += 1;
                } else if (spacesToMove > 0) {
                    curCircle.gridY += spacesToMove;
                    this.visualEffectsManager.createAndPlayFallingTweens(curCircle, spacesToMove, i);
                }
                if (curCircle.active !== false) {
                    remainingCircles.push(curCircle);
                }
            }
            this.addNewCirclesToColumn(column, remainingCircles);
        })
    }

    // This function is called whenever the board is updated. 'curColumnIndex' is the index of the column  
    // that is having new circles created for, 'remainingCircles' is the remainingCircles that were not previously
    // cleared from this column. This function generates as many new cirlces as necessary to fill in the holes left
    // by removed circles. It creates these circles, plays a falling animation for them based on how far they have to
    // fall (spacesToMoveDown), and then adds them to the game state (this.board).
    addNewCirclesToColumn(curColumnIndex, remainingCircles) {
        const newCircles = []
        const spacesToMoveDown = Constants.GRID_HEIGHT - remainingCircles.length;
        for (var gridY = 0; gridY < spacesToMoveDown; gridY++) {
            const newCircle = this.createNewCircle(curColumnIndex, gridY - spacesToMoveDown, gridY)
            newCircles.push(newCircle);
            this.visualEffectsManager.createAndPlayFallingTweens(newCircle, spacesToMoveDown, gridY - spacesToMoveDown);
        }
        this.board[curColumnIndex] = [...newCircles, ...remainingCircles.reverse()];
        this.addOnCollisionHandler(newCircles);
        this.boardRefillHappening = false;
    }

    resetPointsToBeAdded() {
        this.currentPointsToAdd = 0;
        this.gameStateDisplayManager.setPointsToBeAddedText(0, null);
    }

    updatePointsToBeAdded(pointsToAdd, color) {
        this.currentPointsToAdd += pointsToAdd;
        this.gameStateDisplayManager.setPointsToBeAddedText(this.currentPointsToAdd, color);
    }

    addPoints(pointsToAdd, color) {
        this.visualEffectsManager.scoringPointsAnimation(pointsToAdd, color);
        this.score += pointsToAdd;
        this.gameStateDisplayManager.setScoreBoardText(this.score);
    }

    clearBoard() {
        this.board.flat().forEach((circle) => {
            circle.destroy();
            circle = null;
        })
        this.board = [];
        this.selectedCircles = [];
    }

    clearPreviousGame() {
        this.clearBoard();
        this.visualEffectsManager.clearAllGraphics();
        this.gameStateDisplayManager.clearAllText();
    }

    createInitialBoard() {
        const board = Array.from({ length: Constants.GRID_WIDTH }, () => []);
        for (let y = 0; y < Constants.GRID_HEIGHT; y++) {
            for (let x = 0; x < Constants.GRID_WIDTH; x++) {
                board[x].push(this.createNewCircle(x, y, y));
            }
        }
        this.board = board;
        this.addOnCollisionHandler(board.flat());
    }

    startGame() {
        this.initializeGameVariables();
        this.startTimer();
        this.gameStateDisplayManager.setScoreBoardText(0);
        this.createInitialBoard();
    }

    startTimer() {
        this.gameIsRunning = true;
        this.countdown = this.time.addEvent({
            delay: Constants.GAME_LENGTH,
            callback: this.onCountdownComplete,
            callbackScope: this,
            loop: false
        });
    }

    // This function is called once the timer countdown ends (at the end of the game). 
    // It stops the game, clears all UI from the previous game run, and displays a menu.
    onCountdownComplete() {
        this.gameIsRunning = false;
        this.clearPreviousGame();
        if (this.score > this.highScore) {
            this.highScore = this.score;
        }
        this.menuManager.createMenu(`Last Score: ${this.score}`, `High Score ${this.highScore}`, "Try Again?!");
    }

    update() {
        if (this.countdown && this.countdown.getProgress() < 1) {
            this.gameStateDisplayManager.setCountdownText(this.countdown.getRemainingSeconds().toFixed(2));
        }
    }

    initializeGameVariables() {
        this.selectedCircles = [];
        this.score = 0;
        this.currentPointsToAdd = 0;
        this.loopCreated = false;
        this.boardRefillHappening = false;
    }

    // This function sets up the pointermove, pointerdown, and pointerup behavior for the 
    // cursor.
    initializePointerBehavior() {
        // If the player has a circle actively selected then a line is drawn from the most 
        // recent circle to the pointer. The VFXManager handles that complex logic.
        this.input.on('pointermove', (pointer) => {
            if (this.gameIsRunning && pointer.isDown) {
                this.pointerBody.setPosition(pointer.x, pointer.y);
                if (this.selectedCircles.length > 0 && !this.boardRefillHappening) {
                    this.visualEffectsManager.updatePointerLines(pointer);
                }
            }
        });

        // This updates the pointerBody physics object to be matched up with the cursor. 
        this.input.on('pointerdown', (pointer) => {
            if (this.gameIsRunning) {
                this.pointerBody.setPosition(pointer.x, pointer.y);
                if (!this.boardRefillHappening) {
                    this.pointerBody.body.enable = true;
                }
            }
        });

        // when player releases cursor, check if a valid circle selection has been made and remove
        // selected circles. 
        this.input.on('pointerup', () => {
            if (this.gameIsRunning) {
                this.visualEffectsManager.clearAllGraphics();
                this.pointerBody.body.enable = false;

                if (this.selectedCircles.length === 1) {
                    this.selectedCircles = [];
                }
                if (this.selectedCircles.length > 1) {
                    this.clearAllSelectedCircles();
                }
            }
        });
    }

    // Called when a player successfully clears any number of circles. This function handles calling
    // the vfxManager to play the necessary effects and calls the board update function to refill the 
    // empty spaces left behind once the circles have been cleared.
    clearAllSelectedCircles() {
        const columnsToAdjust = [];
        if (this.loopCreated) {
            this.selectedCircles = this.allSimilarColorCircles;
        }
        this.boardRefillHappening = true;
        this.loopCreated = false;
        this.resetPointsToBeAdded();
        this.addPoints((this.selectedCircles.length >= 10
            ? this.selectedCircles.length * 2
            : this.selectedCircles.length), this.selectedCircles[0].color);

        let completedTweens = 0;
        this.selectedCircles.forEach((circle) => {
            if (!columnsToAdjust.includes(circle.gridX)) {
                columnsToAdjust.push(circle.gridX);
            }
            // Play a circle shrink vfx for each circle. This smooths the transition when a circle is removed
            this.visualEffectsManager.shrinkCircle(circle, () => {
                completedTweens++;
                if (completedTweens === this.selectedCircles.length) {
                    // All animations are complete, proceed with board update. It looks better this way
                    this.updateBoard(columnsToAdjust);
                    this.selectedCircles = [];
                }
            });
            // If the player managed to capture more than 10 circles, add a firework vfx for each circle
            if (this.selectedCircles.length >= 10) {
                this.visualEffectsManager.createFireworkParticles(circle);
            }
        });
    }

    create() {
        this.menuManager = new MenuManager(this);
        this.visualEffectsManager = new VisualEffectsManager(this);
        this.gameStateDisplayManager = new GameStateDisplayManager(this);

        // This rescales the world directly based on the GAME_COLUMNS and GAME_ROWS values
        // This ensures the game is scaled to effectively house the game at any size.
        this.physics.world.setBounds(0, 0, Constants.GAME_WIDTH, Constants.GAME_HEIGHT);
        this.scale.resize(Constants.GAME_WIDTH, Constants.GAME_HEIGHT);

        // high score is initialized here so that it doesn't get reset every game run. 
        // intitializeGameVariables is called every game so all variables there are reset each time.
        this.highScore = 0;
        this.initializeGameVariables();
        this.initializePointerBehavior();

        let pointerBody = this.physics.add.sprite(10, 10, null).setVisible(false);
        pointerBody.setCircle(Constants.CELL_SIZE / 6);
        this.pointerBody = pointerBody;

        this.menuManager.createMenu(`Connect Dots`, `Score Points`, "Start Game!");
    }
}
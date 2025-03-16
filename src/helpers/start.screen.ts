import Phaser from "phaser";

/**
 * StartScreen class to manage the game's start menu
 */
export class StartScreen {
  private scene: Phaser.Scene;
  private startCallback: () => void;
  private background!: Phaser.GameObjects.Rectangle;
  private title!: Phaser.GameObjects.Text;
  private startButton!: Phaser.GameObjects.Container;
  private isActive: boolean = false;

  /**
   * Create a new StartScreen
   * 
   * @param scene The current Phaser scene
   * @param startCallback Function to call when the game should start
   */
  constructor(scene: Phaser.Scene, startCallback: () => void) {
    this.scene = scene;
    this.startCallback = startCallback;
  }

  /**
   * Show the start screen
   */
  show(): void {
    this.isActive = true;
    
    // Get the center of the canvas
    const { width, height } = this.scene.cameras.main;
    const centerX = width / 2;
    const centerY = height / 2;
    
    // Create semi-transparent background
    this.background = this.scene.add.rectangle(
      0, 0, width, height, 0x000000, 0.7
    ).setOrigin(0, 0).setDepth(200);
    
    // Add title text
    this.title = this.scene.add.text(
      centerX, 
      centerY - 100, 
      "DUNGEON FIGHTER", 
      {
        fontSize: "48px",
        fontFamily: "Arial",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 6,
        shadow: { offsetX: 2, offsetY: 2, color: '#000000', blur: 5, stroke: true, fill: true }
      }
    ).setOrigin(0.5).setDepth(201);
    
    // Create start button
    const buttonWidth = 200;
    const buttonHeight = 60;
    const buttonBackground = this.scene.add.rectangle(
      0, 0, buttonWidth, buttonHeight, 0x444444, 0.9
    ).setStrokeStyle(3, 0xffffff);
    
    const buttonText = this.scene.add.text(
      0, 0, 
      "START GAME", 
      {
        fontSize: "24px",
        fontFamily: "Arial",
        color: "#ffffff"
      }
    ).setOrigin(0.5);
    
    // Group button elements into a container
    this.startButton = this.scene.add.container(
      centerX, 
      centerY + 50,
      [buttonBackground, buttonText]
    ).setDepth(201);
    
    // Make the button interactive
    buttonBackground.setInteractive({
      useHandCursor: true
    });
    
    // Add hover effects
    buttonBackground.on('pointerover', () => {
      buttonBackground.setFillStyle(0x666666);
    });
    
    buttonBackground.on('pointerout', () => {
      buttonBackground.setFillStyle(0x444444);
    });
    
    // Add click event
    buttonBackground.on('pointerdown', () => {
      this.startGame();
    });

    // Add a version number or subtitle
    this.scene.add.text(
      centerX, 
      centerY - 40, 
      "A Pixel Dungeon Adventure", 
      {
        fontSize: "18px",
        fontFamily: "Arial",
        color: "#cccccc"
      }
    ).setOrigin(0.5).setDepth(201);

    // Add instructions
    this.scene.add.text(
      centerX, 
      height - 80, 
      "Use WASD to move, Mouse to aim and shoot", 
      {
        fontSize: "16px",
        fontFamily: "Arial",
        color: "#ffffff"
      }
    ).setOrigin(0.5).setDepth(201);
  }

  /**
   * Hide and destroy the start screen
   */
  hide(): void {
    if (!this.isActive) return;
    
    // Clean up all elements
    this.background.destroy();
    this.title.destroy();
    this.startButton.destroy();
    
    // Any other elements added should be cleaned up here
    this.scene.children.list
      .filter(child => {
        // Use 'any' casting to bypass TypeScript error
        const gameObject = child as any;
        return gameObject.depth >= 200 && gameObject.depth <= 201;
      })
      .forEach(child => child.destroy());
    
    this.isActive = false;
  }

  /**
   * Start the game
   * This can be called programmatically to bypass the start screen
   */
  startGame(): void {
    if (this.isActive) {
      this.hide();
    }
    
    // Call the provided callback function
    this.startCallback();
  }

  /**
   * Check if the start screen is currently active
   */
  getIsActive(): boolean {
    return this.isActive;
  }
}

import { _decorator, Component, EAxisDirection, NodeEventType, Size, Sprite, UITransform } from "cc";

const { ccclass, property } = _decorator;

@ccclass
export default class AutoSensitiveImage extends Component {

    @property(Sprite)
    sprite: Sprite = null;  // Reference to the sprite component

    @property({ type: EAxisDirection })
    direction: EAxisDirection = EAxisDirection.X_AXIS;

    @property(UITransform)
    renderUI:UITransform = null;

    private initialSize: Size = Size.ZERO.clone();

    onLoad() {
        if (this.sprite == null)
            this.sprite = this.node.getComponent(Sprite);
        if (this.renderUI == null)
            this.renderUI = this.node.parent.getComponent(UITransform);

        this.node.parent.on(NodeEventType.TRANSFORM_CHANGED, this.adjustSpriteSize, this);

        this.adjustSpriteSize();
    }

    protected onDestroy(): void {
        if (this.node && this.node.parent)
            this.node.parent.off(NodeEventType.TRANSFORM_CHANGED, this.adjustSpriteSize, this);
    }

    adjustSpriteSize() {
        if (this.sprite && this.renderUI) {
            // Check if the size has changed
            if (!this.initialSize.equals(this.renderUI.contentSize)) {
                // console.log(`Canvas resized: width = ${this.renderUI.width}, height = ${this.renderUI.height}`);

                const renderDimen = this.renderUI.contentSize;
                this.initialSize.set(renderDimen);

                const spriteFrame = this.sprite.spriteFrame;
                if (spriteFrame) {
                    const originalSize = spriteFrame.originalSize;
                    const aspectRatio = originalSize.width / originalSize.height;
                    let newWidth: number;
                    let newHeight: number;

                    // Calculate the new dimensions while maintaining the aspect ratio
                    if (renderDimen.width / renderDimen.height < aspectRatio) {
                        newHeight = renderDimen.height;
                        newWidth = renderDimen.height * aspectRatio;
                    } else {
                        newWidth = renderDimen.width;
                        newHeight = renderDimen.width / aspectRatio;
                    }

                    // Set the node's size
                    this.node.getComponent(UITransform).setContentSize(newWidth, newHeight);
                }
            }
        }
    }
}

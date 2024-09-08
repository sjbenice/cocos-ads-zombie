import { _decorator, Component, Node, NodeEventType, Size, UITransform, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('AutoArrangeGrid')
export class AutoArrangeGrid extends Component {
    @property(UITransform)
    renderUI:UITransform = null;

    @property
    gap:number = 10;

    private initialSize: Size = Size.ZERO.clone();
    private _itemSize:Size = null;
    onLoad() {
        if (this.renderUI == null)
            this.renderUI = this.getComponent(UITransform);

        if (this.node.children.length > 0)
            this._itemSize = this.node.children[0].getComponent(UITransform).contentSize.clone();

        this.node.on(NodeEventType.TRANSFORM_CHANGED, this.arrangeChildren, this);

        this.arrangeChildren();
    }

    protected onDestroy(): void {
        if (this.node)
            this.node.off(NodeEventType.TRANSFORM_CHANGED, this.arrangeChildren, this);
    }

    arrangeChildren() {
        if (this.renderUI && this._itemSize && !this.initialSize.equals(this.renderUI.contentSize)) {
            // console.log(`Canvas resized: width = ${this.renderUI.width}, height = ${this.renderUI.height}`);

            const renderDimen = this.renderUI.contentSize;
            this.initialSize.set(renderDimen);
            
            let rows, cols;
            if (renderDimen.width > renderDimen.height) {
                rows = 1;
                cols = 6;
            } else {
                rows = 2;
                cols = 3;
            }

            const horzScale = (renderDimen.width - this.gap * (cols - 1)) / (this._itemSize.width * cols);
            const vertScale = (renderDimen.height - this.gap * (rows - 1)) / (this._itemSize.height * rows);
            const scale = Math.min(horzScale, vertScale);
            const itemWidth = this._itemSize.width * scale;
            const itemHeight = this._itemSize.height * scale;
            const left = - (itemWidth * cols + this.gap * (cols - 1)) / 2 + itemWidth / 2;
            const top = (itemHeight * rows + this.gap * (rows - 1)) / 2 - itemHeight / 2;
            const vec3scale = Vec3.ONE.clone();
            vec3scale.multiplyScalar(scale);
            const pos = Vec3.ZERO.clone();

            for (let index = 0; index < this.node.children.length; index++) {
                const element = this.node.children[index];
                element.setScale(vec3scale);
                pos.x = left + (index % cols) * (itemWidth + this.gap);
                pos.y = top - Math.floor(index / cols) * (itemHeight + this.gap);
                element.setPosition(pos);
            }
        }
    }
}



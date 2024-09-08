import { _decorator, Component, Node, Camera, Vec3, Quat, Mat4, director, math, clamp, v3, toDegree, toRadian, NodeSpace, EAxisDirection } from 'cc';
import { getForward, signedAngleVec3 } from './Math';
const { ccclass, property } = _decorator;

@ccclass('Billboard')
export class Billboard extends Component {
    @property(Node)
    cameraNode: Node | null = null;
    
    @property({ type: EAxisDirection })
    direction: EAxisDirection = EAxisDirection.Z_AXIS;

    private _temp1 : Vec3 = Vec3.ZERO.clone();
    private _temp2 : Vec3 = Vec3.ZERO.clone();
    private _rotation : Quat = new Quat();

    start() {
        // If the camera is not set, find the main camera in the scene
        if (!this.cameraNode) {
            const scene = director.getScene();
            this.cameraNode = scene.getChildByName('Main Camera');
        }
    }

    update(deltaTime: number) {
        if (!this.cameraNode) return;

        this._temp1.set(this.direction == EAxisDirection.Z_AXIS ? this.node.forward : this.node.right);
        this._temp2.set(this.cameraNode.forward);
        Quat.rotationTo(this._rotation, this._temp1, this._temp2);
        this.node.rotate(this._rotation);

        this._temp1.set(this.node.up);
        this._temp2.set(this.cameraNode.up);
        Quat.rotationTo(this._rotation, this._temp1, this._temp2);
        this.node.rotate(this._rotation);
    }
}

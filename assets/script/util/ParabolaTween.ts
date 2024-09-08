import { _decorator, Component, Node, v3, Vec3 } from 'cc';
import { Utils } from './Utils';
const { ccclass, property } = _decorator;

@ccclass('ParabolaTween')
export class ParabolaTween extends Component {
    private _startPoint:Vec3;
    private _endPoint:Vec3;
    private _startScale:Vec3;
    private _endScale:Vec3;

    private _duration:number = 0;
    private _height:number = 0;
    private _runtime:number = 0;
    private _totalAngle:number = 0;
    private _targetScale:number = 0;
    private _destroyAtEnd:boolean = true;
    private _callbackParam:any = null;
    private _callback:any = null;

    public setup(endPoint: Vec3, height: number, duration: number,
        targetScale: number = -1, totalAngle: number = 0, destroyAtEnd:boolean = true, 
        callback:any=null, callbackParam:any=null){
        this.enabled = true;
        this._runtime = 0;
        this._startPoint = this.node.position.clone();
        this._endPoint = endPoint.clone();

        this._duration = duration;
        this._height = height;
        this._totalAngle = totalAngle;
        this._targetScale = targetScale;
        this._destroyAtEnd = destroyAtEnd;
        this._callbackParam = callbackParam;
        this._callback = callback;

        this._startScale = this.node.scale.clone();
        this._endScale = targetScale >= 0 ? v3(this._startScale.x * targetScale, this._startScale.y * targetScale, this._startScale.z * targetScale) : null;
    }

    public static moveNodeParabola(node:Node,
        endPoint: Vec3, height: number, duration: number,
        targetScale: number = -1, totalAngle: number = 0, destroyAtEnd:boolean = true, 
        callback:any=null, callbackParam:any=null) {
        if (node) {
            let parabola:ParabolaTween = node.getComponent(ParabolaTween);
            if (!parabola)
                parabola = node.addComponent(ParabolaTween);

            parabola!.setup(endPoint, height, duration, targetScale, totalAngle, destroyAtEnd, 
                callback, callbackParam);
        }
    }

    start() {
        this._runtime = 0;
    }

    update(deltaTime: number) {
        this._runtime += deltaTime;
        const ratio:number = this._runtime / this._duration;
        if (ratio > 1){
            this.enabled = false;

            if (this._destroyAtEnd){
                if (this._callback)
                    this._callback(this.node);

                this.node.removeFromParent();
                this.node.destroy();
            }else{
                this.process(1);

                if (this._callback)
                    this._callback(this.node, this._callbackParam);
    
                this.destroy();
            }

        } else {
            this.process(ratio);
        }
    }

    protected process(ratio:number) {
        const x = Utils.lerp(this._startPoint.x, this._endPoint.x, ratio);
        const y = Utils.parabola(ratio, this._startPoint.y, this._endPoint.y, this._height);
        const z = Utils.lerp(this._startPoint.z, this._endPoint.z, ratio);

        this.node.setPosition(new Vec3(x, y, z));

        // Rotate around the y-axis
        if (this._totalAngle > 0)
            this.node.angle = this._totalAngle * ratio;

        // Scale transformation
        if (this._targetScale >= 0) {
            const scale = Utils.lerpVec3(this._startScale, this._endScale, ratio);
            this.node.setScale(scale);
        }
    }
}



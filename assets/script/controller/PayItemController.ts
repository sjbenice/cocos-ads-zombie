import { _decorator, Component, EAxisDirection, Material, MeshRenderer, Node, ParticleSystem, renderer, sys, tween, v3, Vec3 } from 'cc';
import { Number3d } from '../util/Number3d';
import { Boundary } from '../util/Boundary';
import { SoundMgr } from '../manager/SoundMgr';
import { GameState } from '../manager/GameState';
const { ccclass, property } = _decorator;

@ccclass('PayItemController')
export class PayItemController extends Component {
    @property
    price:number = 100;
    
    @property(Number3d)
    number3d:Number3d = null;
    
    @property(Node)
    progress: Node;
    @property({ type: EAxisDirection })
    progressDirection: EAxisDirection = EAxisDirection.X_AXIS;

    @property(Node)
    vfxGroup:Node = null;
    @property(Node)
    machineNode:Node = null;
    @property(Node)
    palette:Node = null;

    @property(Material)
    defaultMaterial:Material = null;

    protected _materials:Material[] = [];

    public static PAY_UNIT:number = 10;
    public static PAY_DELAY:number = 0.5;
    public static PAY_TIME:number = 0.5;

    private _paied:number = 0;
    private _prevPay:number = 0;
    private _dropTimer:number = 0;
    private _payAmount:number = 0;

    private _progressOrgScale:Vec3 = null;
    private _progressDimension:Vec3 = null;

    private _isTweenRunning:boolean = false;
    private _orgScale:Vec3 = null;
    private _scaleTo:Vec3 = null;

    protected onLoad(): void {
        if (this.number3d)
            this.number3d.setValue(this.price);

        if (this.progress) {
            this._progressOrgScale = this.progress.scale.clone();
            this._progressDimension = v3(4.6,0,0);//Boundary.getMeshDimension(this.progress, true);
            this.progress.active = false;
        }

        this._orgScale = this.node.scale.clone();
        this._scaleTo = this._orgScale.clone();
        this._scaleTo.x *= 1.5;
        this._scaleTo.z *= 1.5;
    }

    start() {
        if (this.machineNode && this.defaultMaterial) {
            this.machineNode.getComponentsInChildren(MeshRenderer).forEach(element => {
                for (let index = 0; index < element.materials.length; index++) {
                    const material = element.getSharedMaterial(index);//element.getMaterialInstance(index);//.materials[index];
                    this._materials.push(material);
                    element.setSharedMaterial(this.defaultMaterial, index);
                }
            });
        }
    }

    public getRemainedPrice() {
        return this.price - this._paied;
    }

    public pay(amount:number) {
        this._dropTimer = 0;
        this._payAmount = amount;
        this._prevPay = 0;
    }

    protected unlockItem() {
        if (this.vfxGroup)
            this.vfxGroup.getComponentsInChildren(ParticleSystem).forEach(vfx => {
                vfx.play();
            });
        
        if (this.palette)
            this.palette.active = false;

        if (this.machineNode) {
            let seq = 0;
            this.machineNode.getComponentsInChildren(MeshRenderer).forEach(element => {
                for (let index = 0; index < element.materials.length; index++) {
                    element.setSharedMaterial(this._materials[seq ++], index);
                }
            });
        }
        SoundMgr.playSound('new_card');
    }

    private showProgress() {
        this.progress.active = true;

        const pos = this.progress.position;
        const scale = this._paied / this.price;

        switch (this.progressDirection) {
            case EAxisDirection.X_AXIS:
                this.progress.setScale(this._progressOrgScale.x * scale, this._progressOrgScale.y, this._progressOrgScale.z);
                this.progress.setPosition(- (1 - scale) * this._progressDimension.x /2, pos.y, pos.z);
                break;
            case EAxisDirection.Y_AXIS:
                this.progress.setScale(this._progressOrgScale.x, this._progressOrgScale.y * scale, this._progressOrgScale.z);
                this.progress.setPosition(pos.x, - (1 - scale) * this._progressDimension.y / 2, pos.z);
                break;
            case EAxisDirection.Z_AXIS:
                this.progress.setScale(this._progressOrgScale.x, this._progressOrgScale.y, this._progressOrgScale.z * scale);
                this.progress.setPosition(pos.x, pos.y, - (1 - scale) * this._progressDimension.z / 2);
                break;
        }
    }

    public isCompleted() : boolean {
        return this._paied >= this.price;
    }

    protected update(dt: number): void {
        if (!this.isCompleted() && this._payAmount > 0) {
            this._dropTimer += dt;
            let length = this._dropTimer / PayItemController.PAY_TIME;
            if (length >= 1) {
                length = 1;
            }
            const curPay = Math.floor(this._payAmount * length);
            if (curPay != this._prevPay) {
                this._paied += curPay - this._prevPay;
                this._prevPay = curPay;

                this.showProgress();
    
                this.number3d.setValue(this.getRemainedPrice());
    
                if (this.isCompleted()) {
                    this.unlockItem();
    
                    // this.scaleEffect();
                }
            }
            if (length >= 1) {
                this._payAmount = 0;
            }
        }
    }

    protected scaleEffect() {
        if (!this._isTweenRunning){
            this._isTweenRunning = true;
            tween(this.node)
                .to(0.2, {scale:this._scaleTo}, { easing: 'circIn' })
                .to(0.2, {scale:this._orgScale}, { easing: 'circIn' })
                .union()
                .call(() => {
                    // Set the flag to false when the tween completes
                    this._isTweenRunning = false;
                })
                .start()
        }
    }
}



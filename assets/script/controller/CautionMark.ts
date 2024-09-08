import { _decorator, Billboard, Color, Component, MeshRenderer, Node, sys, tween, Tween, v3, Vec3 } from 'cc';
import { SoundMgr } from '../manager/SoundMgr';
const { ccclass, property } = _decorator;

@ccclass('CautionMark')
export class CautionMark extends Component {
    @property(MeshRenderer)
    shpere:MeshRenderer = null;
    
    protected _billboard:Billboard = null;
    protected _billboardWidth:number;
    protected _billboardHeight:number;

    protected _sound:boolean = false;
    protected _blinkTimer:number = 0;
    protected _blinkPast:number = 0;

    public static TIME_BLINK:number = 1;
    protected _scaleVfx:Vec3 = v3(1.2, 1.2, 1.2);
    protected _albedo:Color = Color.YELLOW.clone();
    protected _working:boolean = true;

    protected _soundCount:number = 0;

    protected onLoad(): void {
        this._billboard = this.getComponent(Billboard);

        if (this._billboard) {
            this._billboardWidth = this._billboard.width;
            this._billboardHeight = this._billboard.height;
        }
    }

    protected onDestroy(): void {
        Tween.stopAllByTarget(this.node);

        this.unscheduleAllCallbacks();
    }

    public setWorking(work:boolean) {
        this._working = work;
    }

    public showCaution(show:boolean, time:number) {
        if (!this._working)
            show = false;

        if (this.node.active != show) {
            this.node.active = show;
            if (show) {
                this.resetBlinkTimer();
            }
        }

        if (show && !this._sound && this._soundCount <= 2) {
            this._sound = true;
            SoundMgr.playSound('caution');
            this._soundCount ++;
            this.scheduleOnce(this.onCautionSoundEnd, CautionMark.TIME_BLINK);
        }

        if (show && time > 0) {
            this.scheduleOnce(()=>{
                this.showCaution(false, 0);
            }, time);
        }
    }

    protected onCautionSoundEnd() {
        this._sound = false;
    }

    protected resetBlinkTimer() {
        this._blinkTimer = sys.now() / 1000;
        this._blinkPast = 0;
    }

    protected update(dt: number): void {
        if (this._billboard && this._blinkTimer > 0) {
            this._blinkPast += dt;

            if (this._blinkPast >= CautionMark.TIME_BLINK)
                this.resetBlinkTimer();

            let ratio = this._blinkPast / CautionMark.TIME_BLINK;
            if (ratio <= 0.5) {
                ratio += 1;
            } else {
                ratio = 2 - ratio;
            }
        
            this._billboard.width = this._billboardWidth * ratio;
            this._billboard.height = this._billboardHeight * ratio;

            if (this.shpere) {
                this._albedo.a = (ratio - 1) * 130;
                this.shpere.material.setProperty('albedo', this._albedo);
            }
        }
    }
}



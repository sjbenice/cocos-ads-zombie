import { _decorator, CameraComponent, Color, Component, Game, Graphics, Label, Node, path, toRadian, tween, Tween, UITransform, v3, Vec3 } from 'cc';
import { GameState } from '../manager/GameState';
const { ccclass, property } = _decorator;

@ccclass('Tutor')
export class Tutor extends Component {
    public static MESSAGE = {
        NONE:-1,
        LETS_CUT:0,
        TOO_SMALL:1,
        TOO_HEAVY:2,
        DONT_ZIGZAG:3,
        TRACE_COMPLETELY:4,
        RANGE_OVER:5,
        DONT_CROSS:6,
        CANT_CUT:7,
    };

    @property(Node)
    hand:Node = null;

    @property(Label)
    message:Label = null;

    @property(Graphics)
    public graphics: Graphics = null;

    public static START_X:number = 1;

    protected static _MESSAGES:string[] = ["Cut the gold!", "Too small!", "Too heavy!", 
        "Don't zig-zag!", "Trace completely!", "Range over!", "Don't cross!", "Can't cut!"];

    protected segmentSpacing: number = 40;
    protected segmentLength: number = this.segmentSpacing * 1.5;
    protected _timer:number = 0;
    protected static SPEED:number = 500;
    protected _totalDistance:number = 0;
    protected _isWorking:boolean = false;

    protected _tempPos0:Vec3 = Vec3.ZERO.clone();
    protected _tempPos1:Vec3 = Vec3.ZERO.clone();
    protected _tempPos2:Vec3 = Vec3.ZERO.clone();
    protected _tempPos3:Vec3 = Vec3.ZERO.clone();
    protected _segStart:Vec3 = Vec3.ZERO.clone();
    protected _segEnd:Vec3 = Vec3.ZERO.clone();
    protected _pos:Vec3 = Vec3.ZERO.clone();

    protected _pathPoint:Vec3 = Vec3.ZERO.clone();

    // ([-0-9]+)[\.0-9]* ([-0-9]+)[\.0-9]*
    // new Vec3(\1, \2, 0),
    // Path properties (you can replace this with actual path points)
    protected static pathPoints1: Vec3[] = [
        new Vec3(-30, -200, 0),
        new Vec3(-116, -160, 0),
        new Vec3(-190, -85, 0),
        new Vec3(-190, 0, 0),
        new Vec3(-200, 100, 0),
        new Vec3(-126, 140, 0),
        new Vec3(-30, 170, 0),
        new Vec3(70, 170, 0),
        new Vec3(170, 150, 0),
    ];
    protected static pathPoints2: Vec3[] = [
        new Vec3(165, -253, 0),
        new Vec3(105, -240, 0),
        new Vec3(43, -227, 0),
        new Vec3(-15, -213, 0),
        new Vec3(-72, -190, 0),
        new Vec3(-120, -154, 0),
        new Vec3(-155, -103, 0),
        new Vec3(-175, -46, 0),
        new Vec3(-177, 15, 0),
        new Vec3(-155, 72, 0),
        new Vec3(-125, 125, 0),
        new Vec3(-73, 156, 0),
        new Vec3(-15, 170, 0),
        new Vec3(46, 170, 0),
        new Vec3(107, 166, 0),
        new Vec3(166, 149, 0),
        new Vec3(350, 133, 0),
    ];
    protected static pathPoints3: Vec3[] = [
        new Vec3(203, -225, 0),
        new Vec3(143, -226, 0),
        new Vec3(80, -226, 0),
        new Vec3(20, -226, 0),
        new Vec3(-39, -226, 0),
        new Vec3(-102, -225, 0),
        new Vec3(-162, -222, 0),
        new Vec3(-222, -210, 0),
        new Vec3(-253, -159, 0),
        new Vec3(-267, -100, 0),
        new Vec3(-272, -40, 0),
        new Vec3(-270, 19, 0),
        new Vec3(-252, 76, 0),
        new Vec3(-226, 130, 0),
        new Vec3(-172, 159, 0),
        new Vec3(-112, 169, 0),
        new Vec3(-52, 169, 0),
        new Vec3(7, 162, 0),
        new Vec3(60, 132, 0),
        new Vec3(113, 103, 0),
        new Vec3(162, 67, 0),
        new Vec3(209, 29, 0),
        new Vec3(255, -10, 0),
        new Vec3(282, -65, 0),
    ];

    protected dividePoints:Vec3[] = [
        v3(0, 0, 0),
        v3(0, 0, 0),
    ];

    protected _isDivide:boolean = false;

    public getPathPoints() :Vec3[]{
        if (this._isDivide)
            return this.dividePoints;

        switch (GameState.getState()) {
            case GameState.State.SECOND:
                return Tutor.pathPoints2;
            case GameState.State.THIRD:
                return Tutor.pathPoints3;
            default:// GameState.State.FIRST:
                return Tutor.pathPoints1;
        }
    }

    public setArea(area:number, camera3d:CameraComponent) {
        // this.pathPoints = [];

        // const radius = Math.ceil(Math.sqrt(2 * area / Math.PI));
        // for (let angle = 90; angle <= 270; angle += 30) {
        //     const radian = toRadian(angle);
        //     this._tempPos0.set(Math.cos(radian) * radius + Tutor.START_X, 0, Math.sin(radian) * radius);
        //     console.log(this._tempPos0);
        //     const pos = camera3d.worldToScreen(this._tempPos0);
        //     // uiCamera.screenToWorld(this._tempPos2, out);
        //     console.log(pos);
        //     this.pathPoints.push(pos);
        // }
    }

    public showTutor(show:boolean) {
        if (show)
            this._isDivide = false;

        this.unscheduleAllCallbacks();
        if (show) {
            if (!GameState.isEnd()) {
                this.scheduleOnce(()=>{
                    this.doShow(true);
                    this.showMessage(Tutor.MESSAGE.LETS_CUT, -1);
                }, 2);
            }
        } else {
            this.doShow(false);

            this.showMessage(Tutor.MESSAGE.NONE, 0);
        }
    }

    protected doShow(show:boolean) {
        if (this.hand)
            this.hand.active = show;

        this._timer = 0;
        this._isWorking = show;

        if (show) {
            this.calcTotalDistance();
        } else {
            if (this.graphics)
                this.graphics.clear();
        }
    }

    shouldDivide() {
        return this._isDivide;
    }

    clearDivide() {
        this._isDivide = false;
    }
    
    showDivide(uiPos:Vec3) {
        this._isDivide = true;

        uiPos.z = 0;

        this.getComponent(UITransform).convertToNodeSpaceAR(uiPos, this.dividePoints[0]);

        this.dividePoints[1].x = this.dividePoints[0].x  - 300;
        this.dividePoints[1].y = this.dividePoints[0].y + 80;

        this.doShow(true);
    }

    onLoad() {
        if (!this.graphics)
            this.graphics = this.addComponent(Graphics);

        this.graphics.strokeColor = Color.WHITE;
        this.graphics.lineWidth = this.segmentSpacing / 2;
    }

    protected start(): void {
        // this.showTutor(true);
        // this.drawLinePatternPath(this._totalDistance);
    }

    protected calcTotalDistance() {
        const path:Vec3[] = this.getPathPoints();
        for (let index = 0; index < path.length - 1; index++) {
            this._tempPos0.set(path[index]);
            this._totalDistance += this._tempPos0.subtract(path[index + 1]).length();
        }
    }

    public checkRange(localY:number) : boolean {
        const delta = 150;

        switch(GameState.getState()) {
            case GameState.State.FIRST:
                const path = this.getPathPoints();
                const last = this.getPathPoint4state(path.length - 1, this._pathPoint);
                return localY < last.y + delta;
            case GameState.State.SECOND:
                const first = this.getPathPoint4state(0, this._pathPoint);
                return localY > first.y - delta;
        }

        return true;
    }

    public checkPath(xz:number[]) : boolean {
        if (GameState.getState() == GameState.State.SECOND) {
            if (xz.length > 4) {
                const x0 = xz[0] - xz[xz.length - 2];
                const z0 = xz[1] - xz[xz.length - 1];
                const x1 = Tutor.pathPoints2[0].x - Tutor.pathPoints2[Tutor.pathPoints2.length - 1].x;
                const z1 = Tutor.pathPoints2[0].y - Tutor.pathPoints2[Tutor.pathPoints2.length - 1].y;
                // console.log((x0 * x0 + z0 * z0) / (x1 * x1 + z1 * z1))
                return (x0 * x0 + z0 * z0) > (x1 * x1 + z1 * z1) * 0.3;
            }

            return false;
        }

        return true;
    }

    protected getPathPoint4state(index:number, out:Vec3) {
        const path = this.getPathPoints();
        out.set(path[index]);

        return out;
    }

    protected drawLinePatternPath(remainDistance:number) {
        const path = this.getPathPoints();

        if (!this.graphics || path.length < 2) {
            return;
        }

        this.node.getPosition(this._pos);
        this._pos.x += 1;
        this.node.setPosition(this._pos);
        this._pos.x -= 1;
        this.node.setPosition(this._pos);

        // Clear any previous drawings
        this.graphics.clear();

        const patternLength = this.segmentLength + this.segmentSpacing;
        // const offset = remainDistance % patternLength;

        this.getPathPoint4state(0, this._segStart);

        for (let i = 1; i < path.length ; i ++) {
            const pathPoint = this.getPathPoint4state(i, this._pathPoint);
            let segmentDistance = Vec3.subtract(this._tempPos0, this._segStart, pathPoint).length();
            const direction = Vec3.subtract(this._tempPos0, pathPoint, this._segStart).normalize();

            while (remainDistance > 0 && segmentDistance >= patternLength) {
                this._tempPos1.set(direction);

                Vec3.add(this._segEnd, this._segStart, this._tempPos1.multiplyScalar(Math.min(this.segmentLength, remainDistance)));
                this.drawLineSegment(this._segStart, this._segEnd);
                // console.log(this._segStart);

                if (remainDistance <= patternLength && this.hand) {
                    this._tempPos1.set(direction);
                    Vec3.add(this._segEnd, this._segStart, this._tempPos1.multiplyScalar(remainDistance));
                    this.hand.setPosition(this._segEnd);
                }

                this._tempPos1.set(direction);
                Vec3.add(this._segEnd, this._segStart, this._tempPos1.multiplyScalar(patternLength));
                this._segStart.set(this._segEnd);

                segmentDistance -= patternLength;
                remainDistance -= patternLength;
            }
        }
    }

    protected drawLineSegment(start: Vec3, end: Vec3) {
        this.graphics.moveTo(start.x, start.y);
        this.graphics.lineTo(end.x, end.y);
        this.graphics.stroke();
    }

    update(deltaTime: number) {
        if (this._isWorking) {
            this._timer += deltaTime;
            let distance = this._timer * Tutor.SPEED;
            if (distance >= this._totalDistance) {
                distance = this._totalDistance;
                this._timer = 0;
            }
    
            this.drawLinePatternPath(distance);
        }
    }

    public showMessage(id:number, repeat:number) {
        if (this.message) {
            Tween.stopAllByTarget(this.message.node);
            if (id <= Tutor.MESSAGE.NONE)
                this.message.node.active = false;
            else {
                this.message.node.active = true;
                this.message.string = Tutor._MESSAGES[id];
                this.message.node.setScale(Vec3.ZERO);
                const tw = tween(this.message.node)
                .to(0.5, {scale:Vec3.ONE}, {easing:'quadOut'})
                // .to(0.5, {scale:Vec3.ZERO}, {easing:'quadOut'})
                // .union();

                // if (repeat > 0)
                //     tw.repeat(repeat);
                // else if (repeat < 0)
                //     tw.repeatForever();

                tw.start();
            }
        }
    }
}



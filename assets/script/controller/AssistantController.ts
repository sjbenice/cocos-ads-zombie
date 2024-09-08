import { _decorator, BoxCollider, Camera, Collider, Component, ERigidBodyType, Game, game, instantiate, lerp, MeshCollider, MeshRenderer, Node, ParticleSystem, PointToPointConstraint, Prefab, Quat, random, randomRange, RigidBody, SkeletalAnimation, v3, Vec3 } from 'cc';
import { AvatarController } from './AvatarController';
import { SoundMgr } from '../manager/SoundMgr';
import { Tutor } from './Tutor';
import { CSG } from '../util/CSG';
import { GoldController } from './GoldController';
import { MoneyController } from './MoneyController';
import { PayItemController } from './PayItemController';
import { GameState } from '../manager/GameState';
import { ParabolaTween } from '../util/ParabolaTween';
import { MachineController } from './MachineController';
import { CautionMark } from './CautionMark';
import { GoldFieldController } from './GoldFieldController';
const { ccclass, property } = _decorator;

@ccclass('AssistantController')
export class AssistantController extends AvatarController{
    static State = {
        NONE: -1,
        IDLE: 0,
        CUT_PREPARE: 1,
        CUT: 2,
        CUT_FINISH: 3,
        THROW: 4,
        DRAG_PREPARE: 5,
        DRAG: 6,
        DRAG_FINISH: 7,
        BUY: 8,
        GO_MACHINE: 9,
        RETURN: 10,
    };

    static Animation = {
        IDLE: 0,
        RUN: 1,
        DRILL: 2,
        THROW: 3,
        DRAG: 4,
        NORMAL: 5,
        DRIVE: 6,
    };

    @property(Node)
    drillNode:Node = null;

    @property(ParticleSystem)
    vfx:ParticleSystem = null;

    @property(Node)
    factoryNode:Node = null;

    @property(GoldController)
    goldSub:GoldController = null;

    @property(MoneyController)
    money:MoneyController = null;

    @property(PayItemController)
    payItems:PayItemController[] = [];

    @property(Prefab)
    coinPrefab:Prefab = null;

    @property(Node)
    returnGroup:Node[] = [];

    @property(Node)
    goldHill:Node = null;
    
    @property(Node)
    tractorPos:Node = null;

    @property(Node)
    drillPos:Node = null;

    @property(Camera)
    uiCamera:Camera = null;

    @property(Prefab)
    chainPrefab:Prefab = null;

    @property(Node)
    ropeGroup:Node = null;

    @property(CautionMark)
    caution:CautionMark = null;

    protected static CUT_HEIGHT:number = 6;
    protected _factoryPos:Vec3 = null;

    private _moveInput:Vec3 = Vec3.ZERO.clone();
    private _targetPos:Vec3 = Vec3.ZERO.clone();
    private _curPos:Vec3 = Vec3.ZERO.clone();

    private _state:number = AssistantController.State.IDLE;
    private _moving:boolean = false;

    protected _tutor:Tutor = null;
    protected _goldPrice:number = 0;

    protected _mountain:GoldFieldController = null;
    protected _mountainPosNegative:Vec3 = Vec3.ZERO.clone();
    protected _cutPath:Vec3[] = null;
    protected _pathIndex:number = 0;
    protected _isSmall:boolean = false;
    protected _shouldDivide:boolean = false;

    protected static LEFT:Vec3 = v3(-1, 0, 0);
    protected static BACKWARD:Vec3 = v3(0, 0, 1);

    protected _isBuying:boolean = false;
    protected _buyPos:Vec3 = Vec3.ZERO.clone();
    protected _buyIndex:number = 0;

    protected _machine:MachineController = null;
    protected _tempPos:Vec3 = Vec3.ZERO.clone();
    protected _nodePos:Vec3 = Vec3.ZERO.clone();

    protected _goldHillMove:boolean = false;

    private _cameraFov:number = 0;
    private _cameraFovSpeed:number = 1;
    private _cameraFovScale:number = 0.8;

    private _isThrowed:boolean = false;

    public isWorking() : boolean {
        return this._state != AssistantController.State.IDLE;
    }

    public isBot() : boolean {
        return true;
    }

    start() {
        super.start();

        this.showDrill(false);
        
        if (this.factoryNode)
            this._factoryPos = this.factoryNode.getWorldPosition();

        if (this.camera)
            this._cameraFov = this.camera.fov;
    }

    public cutGold(mountain:GoldFieldController, path:Vec3[], tutor:Tutor, area:number, maxArea:number, isSmall:boolean) {
        this._state = AssistantController.State.CUT_PREPARE;

        this._tutor = tutor;
        this._goldPrice = Math.floor(area * MoneyController.CHANGE_UNIT);

        if (!this._mountain) {
            this._mountain = mountain;
            if (mountain) {
                mountain.node.getWorldPosition(this._mountainPosNegative);
                this._mountainPosNegative.negative();
            }
        }

        this._cutPath = path;
        this._pathIndex = 0;

        this._shouldDivide = area > maxArea;
        this._isSmall = isSmall;

        // if (this._machine)
        //     this._machine.follow(null);

        this.setTargetPos(path[0], true);
    }

    protected isInTractor() : boolean {
        return false;
        // return this._machine && this._machine.isWorking();
    }

    protected getMaxSpeed(){
        let speed = this.baseSpeed;
        if (this.isInTractor())
            speed /= 2;
        return speed;
    }

    protected getAnimationName(idle:boolean): string {
        let ret:string = null;

        let index:number = -1;
        if (this.isInTractor())
            index = AssistantController.Animation.DRIVE;
        else {
            switch (this._state) {
                case AssistantController.State.CUT:
                    index = AssistantController.Animation.DRILL;
                    break;
                case AssistantController.State.THROW:
                    // index = AssistantController.Animation.THROW;
                    // break;
                case AssistantController.State.DRAG_PREPARE:
                    index = AssistantController.Animation.NORMAL;
                    break;
                case AssistantController.State.DRAG:
                    index = AssistantController.Animation.DRAG;
                    break;
                case AssistantController.State.DRAG_FINISH:
                case AssistantController.State.BUY:
                case AssistantController.State.NONE:
                    index = AssistantController.Animation.NORMAL;
                    break;
            }
        }

        if (index >= 0)
            ret = this._skeletalAnimation.clips[index].name;
        else
            ret = super.getAnimationName(idle);

        return ret;
    }

    protected getCameraFollowPosition(out:Vec3) {
        super.getCameraFollowPosition(out);

        if (this._state == AssistantController.State.BUY) {
            out.set(this._buyPos);
        }
        // else if (this._state == AssistantController.State.CUT) {
        //     out.x += random() * 4;
        //     out.z += random() * 4;
        // }
    }

    protected followCameraZoom(deltaTime:number) {
        let fov = this._cameraFov * (this._state == AssistantController.State.CUT ? this._cameraFovScale : 1);
        switch(GameState.getState()) {
            case GameState.State.SECOND:
                fov *= 1.2;
                break;
            case GameState.State.THIRD:
                fov *= 1.4;
                break;
        }

        this.camera.fov = lerp(this.camera.fov, fov, deltaTime * this._cameraFovSpeed);
    }

    protected addCameraOffset(ioPos:Vec3, offset:Vec3) {
        super.addCameraOffset(ioPos, offset);
        if (this._state == AssistantController.State.IDLE) {
            switch(GameState.getState()) {
                case GameState.State.SECOND:
                    ioPos.x -= 6.5;
                    break;
                case GameState.State.THIRD:
                    ioPos.x -= 10;
                    break;
            }
        }
    }

    protected showDrill(show:boolean) {
        if (this.drillNode) {
            this.drillNode.active = show;
        }
        if (this.vfx) {
            if (show)
                this.vfx.play();
            else
                this.vfx.stop();
        }
    }

    protected cutMesh(index:number) {
        if (index < this._cutPath.length - 1) {
            if (!this._isSmall || index == 0) {
                const cutCSG = CSG.cube1(this._cutPath[index].x, this._cutPath[index].z, 
                    this._cutPath[index + 1].x, this._cutPath[index + 1].z, 
                    AssistantController.CUT_HEIGHT, 1, 
                    false, this._mountainPosNegative);
                this.updateMountain(cutCSG, false);
            }
        }
    }

    protected updateMountain(csg:CSG, makeSub:boolean): CSG {
        let ret:CSG = null;
        if (csg && this._mountain) {
            const newMountain = this._mountain.getCSG().subtract(csg);
            if (makeSub)
                ret = this._mountain.getCSG().intersect(csg);
            else{
                // const node = new Node();
                // node.setPosition(v3(4,0,0));
                // const newMesh = node.addComponent(MeshRenderer);
                // newMesh.mesh = CSG.toMesh(csg);
                // newMesh.setSharedMaterial(this._mountain.getComponent(MeshRenderer).sharedMaterial, 0);
                // this._mountain.parent.addChild(node);
            }

            this._mountain.setCSG(newMountain);
        }

        return ret;
    }
    
    public getUI43d(pos:Vec3) {
        if (this.camera && this.uiCamera) {
            this.camera.worldToScreen(pos, this._tempPos);
            this.uiCamera.screenToWorld(this._tempPos, pos);
            pos.z = 0;
        }
    }

    update(deltaTime: number) {
        this._moveInput.set(Vec3.ZERO);

        if (this._moving) {
            this.node.getPosition(this._curPos);
            if (this._curPos.subtract(this._targetPos).lengthSqr() < 0.1){
                this.node.position = this._targetPos;
                this._moving = false;
            } else {
                this.calcMoveInput(this._targetPos);
            }
        }

        switch (this._state) {
            case AssistantController.State.CUT_PREPARE:
                if (!this._moving) {
                    this._state = AssistantController.State.CUT;
                    this.showDrill(true);
                    this._pathIndex = 0;
                    this.cutMesh(0);
                    this.setTargetPos(this._cutPath[this._pathIndex ++], true);

                    if (this._machine) {
                        const firstPos = this._cutPath[0];
                        const lastPos = this._cutPath[this._cutPath.length - 1];
                        const topPos = firstPos.z < lastPos.z ? firstPos : lastPos;
                        const tractorPos = topPos.clone();
                        tractorPos.x += 2;
                        tractorPos.z += Math.abs(firstPos.z - lastPos.z) / 3;

                        this._machine.moveTo(tractorPos);
                    }
                }
                break;
            case AssistantController.State.CUT:
                if (!this._moving) {
                    if (this._pathIndex < this._cutPath.length) {
                        this.cutMesh(this._pathIndex);
                        this.setTargetPos(this._cutPath[this._pathIndex ++], true);
                    } else {
                        this._state = AssistantController.State.CUT_FINISH;
                        this.showDrill(false);

                        SoundMgr.playSound('woohoo');
   
                        // if (this._machine) {
                        //     this.setTargetPos(this._machine.driverPos.getWorldPosition(), false);
                        // } else {
                            this._targetPos.add(this._cutPath[0]).multiplyScalar(0.5);
                            this.setTargetPos(this._targetPos, true);
                        // }
                    }
                }
                break;
            case AssistantController.State.CUT_FINISH:
                if (!this._moving) {
                    if (this.faceView(Vec3.RIGHT, deltaTime) < 0.01){
                        this._state = AssistantController.State.THROW;
                        this._isThrowed = false;
                    }
                }
                break;
            case AssistantController.State.THROW:
                if (!this._isThrowed) {
                    this._isThrowed = true;

                    function checkZ(z:number, p0:Vec3, p1:Vec3, prev:any) : number | null {
                        if ((p0.z <= z && z <= p1.z) || (p1.z <= z && z <= p0.z))
                            return (p0.x + p1.x) / 2;
                        return prev;
                    };

                    const xz = [];
                    let zombieX = null, tractorX = null;
                    const zombieZ = this.node.position.z;//(this._cutPath[0].z + this._cutPath[this._cutPath.length - 1].z) / 2;
                    const tractorZ = this._machine ? this._machine.node.position.z : 0;
                    for (let index = 0; index < this._cutPath.length; index++) {
                        const element = this._cutPath[index];
                        xz.push(element.x, element.z);

                        if (index < this._cutPath.length - 1) {
                            const nextElement = this._cutPath[index + 1];
                            zombieX = checkZ(zombieZ, element, nextElement, zombieX);
                            if (this._machine)
                                tractorX = checkZ(tractorZ, element, nextElement, tractorX);
                        }
                    }

                    // let chainLength:number = zombieX ? (this.node.position.x - zombieX) : 0;
                    this.thowRope(zombieX ? (this.node.position.x - zombieX) : 0);

                    if (this._machine)
                        this._machine.thowRope(tractorX ? (this._machine.node.position.x - tractorX) : 0);

                    SoundMgr.playSound('chains');

                    this.scheduleOnce(()=>{
                        if (this._shouldDivide) {
                            this._shouldDivide = false;
                            if (this._tutor) {
                                this.scheduleOnce (()=>{
                                    this.hideRope();

                                    this._state = AssistantController.State.IDLE;
                                    this.node.getWorldPosition(this._nodePos);
                                    this.getUI43d(this._nodePos);
                                    this._tutor.showDivide(this._nodePos);
                                }, 2);
                                this._tutor.showMessage(Tutor.MESSAGE.TOO_HEAVY, 3);
                                this._state = AssistantController.State.NONE;
                            }

                            if (this.caution) {
                                this.caution.showCaution(true, CautionMark.TIME_BLINK * 2);
                            }
                        } else {
                            const cutPolygon = CSG.polyBox(AssistantController.CUT_HEIGHT, xz, false, this._mountainPosNegative);
                            if (cutPolygon) {
                                const subGold = this.updateMountain(cutPolygon, true);
                                if (subGold) {
                                    const center:Vec3 = subGold.centerize();
        
                                    this.goldSub.setParam(CSG.toMesh(subGold), this._mountain.node.getWorldPosition().add(center), 
                                        0, this.node.getWorldPosition());
                                }
                            }
                            this._state = AssistantController.State.DRAG_PREPARE;
                        }
                    }, 0.5);
                }
                break;
            case AssistantController.State.DRAG_PREPARE:
                if (this.faceView(Vec3.RIGHT, deltaTime) < 0.01){
                    this._state = AssistantController.State.DRAG;
                    this.setTargetPos(this._factoryPos, true/*!this._machine*/);

                    this.disableRope();

                    if (this.goldSub)
                        this.goldSub.follow(this.node);
                    
                    if (this._machine) {
                        // this._machine.follow(this.node, 10);
                        this._machine.moveParalell(this.node);
                    }
                    
                    if (GameState.getState() == GameState.State.SECOND) {
                        if (this.goldHill && this.goldSub) {
                            this._goldHillMove = true;
                            this.goldHill.getWorldPosition(this._tempPos);
                            this.goldHill.setParent(this.goldSub.node);
                            this.goldHill.setWorldPosition(this._tempPos);
                        }
                    }
                }
                break;
            case AssistantController.State.DRAG:
                if (!this._moving) {
                    if (this._machine)
                        this._machine.moveParalell(null);
                    this.hideRope();

                    this._state = AssistantController.State.DRAG_FINISH;
                    if (this.goldSub) {
                        this.goldSub.follow(null);
                        this.goldSub.hideRope();
                        this.goldSub.hideGold();

                        if (this._goldHillMove && this.goldHill) {
                            this.goldHill.removeFromParent();
                            this.goldHill.destroy();
                            this.goldHill = null;
                        }
                    }

                    if (this.money)
                        this.money.addMoney(this._goldPrice);
                    SoundMgr.playSound('money');

                    SoundMgr.playSound('transform_metal');
                }
                break;
            case AssistantController.State.DRAG_FINISH:
                if (this.faceView(Vec3.FORWARD, deltaTime) < 0.01){
                    const gameState:number = GameState.getState();
                    if (GameState.State.FIRST <= gameState && gameState <= GameState.State.SECOND) {
                        const index:number = gameState - GameState.State.FIRST;
                        if (this.payItems && 0 <= index && index < this.payItems.length) {
                            this._isBuying = false;
                            this._buyIndex = index;
                            this._state = AssistantController.State.BUY;
                            this.payItems[index].node.getPosition(this._buyPos);
                        }
                    } else {
                        this._state = AssistantController.State.RETURN;
                        this.setTargetPos(this.returnGroup[gameState].getPosition(), true);
                    }

                    if (this._machine) {
                        this._machine.moveTo(this.tractorPos.getWorldPosition());
                    }
                }
                break;
            case AssistantController.State.BUY:
                if (!this._isBuying) {
                    this._isBuying = true;

                    const remainPrice = this.payItems[this._buyIndex].getRemainedPrice();
                    const buyPrice = Math.min(remainPrice, this.money!.getMoney());
                    this.scheduleOnce(()=>{
                        if (this.money)
                            this.money.addMoney(-buyPrice);

                        this.payItems[this._buyIndex].pay(buyPrice);
                    }, PayItemController.PAY_DELAY);

                    if (this.coinPrefab) {
                        for (let index = 0; index < buyPrice; index+= PayItemController.PAY_UNIT) {
                            const coin = instantiate(this.coinPrefab);
                            this.node.parent.addChild(coin);
                            coin.setWorldPosition(this._factoryPos);
                            coin.getPosition(this._targetPos);
                            const xDelta = randomRange(-2, 2), yDelta = randomRange(-2, 2);
                            this._targetPos.x += xDelta;
                            this._targetPos.z += yDelta;
                            coin.setPosition(this._targetPos);
                            this._targetPos.set(this._buyPos);
                            this._targetPos.x += xDelta;
                            this._targetPos.z += yDelta;
                            ParabolaTween.moveNodeParabola(coin, this._targetPos, randomRange(10, 15), 
                                randomRange(PayItemController.PAY_DELAY, PayItemController.PAY_DELAY + PayItemController.PAY_TIME), 1, 360, true);
                        }
                    }

                    this.scheduleOnce(()=>{
                        // if (buyPrice >= remainPrice && GameState.getState() == GameState.State.FIRST) {
                        //     this._state = AssistantController.State.GO_MACHINE;
                        //     this._machine = this.payItems[this._buyIndex].machineNode.getComponent(MachineController);
                        //     this.setTargetPos(this._machine!.driverPos.getWorldPosition(), false);
                        // } else {
                            if (buyPrice >= remainPrice) {
                                const machine = this.payItems[this._buyIndex].machineNode.getComponent(MachineController);
                                switch (GameState.getState()) {
                                    case GameState.State.FIRST:
                                        this._machine = machine;
                                        this._machine.moveParalell(this.node);
                                        this._machine.moveParalell(null);
                                        this._machine.moveTo(this.tractorPos.getWorldPosition());
                                        break;
                                    case GameState.State.SECOND:
                                        machine.moveTo(this.drillPos.getWorldPosition());
                                        machine.startWorking(true);
                                        break;
                                }
                                GameState.setState(GameState.getState() + 1);
                            }

                            this._state = AssistantController.State.RETURN;
                            this.setTargetPos(this.returnGroup[GameState.getState()].getPosition(), true);
                        // }
                    }, (PayItemController.PAY_DELAY + PayItemController.PAY_TIME));
                }
                break;
            case AssistantController.State.GO_MACHINE:
                if (!this._moving) {
                    if (this.faceView(AssistantController.BACKWARD, deltaTime) < 0.01){
                        GameState.setState(GameState.getState() + 1);

                        // if (this._machine) {
                        //     this._machine.follow(this.node);
                        // }
    
                        this._state = AssistantController.State.RETURN;
                        this.setTargetPos(this.returnGroup[GameState.getState()].getPosition(), false);
                    }
                }
                break;
            case AssistantController.State.RETURN:
                if (!this._moving) {
                    if (/*!this._machine || */this.faceView(Vec3.RIGHT, deltaTime) < 0.01){
                        this._state = AssistantController.State.IDLE;
                        if (this._tutor)
                            this._tutor.showTutor(true);
                    }
                }
                break;
        }

        super.update(deltaTime);
    }

    protected setTargetPos(pos:Vec3, zeroY:boolean) {
        this._targetPos.set(pos);
        if (zeroY)
            this._targetPos.y = 0;
        this._moving = true;
    }

    protected calcMoveInput(endPos:Vec3){
        if (endPos){
            this._moveInput.set(endPos);
            this._moveInput.subtract(this.node.position);
            this._moveInput.normalize();
        }else{
            this._moveInput.set(Vec3.ZERO);
        }

        return this._moveInput;
    }

    protected fetchMovementInput() : Vec3{
        return this._moveInput;
    }

    protected disableRope() {
        this.ropeGroup.children.forEach(element => {
            element.getComponents(PointToPointConstraint).forEach(p2p => {
                p2p.destroy();//.enabled = false;
            });
            const rigid = element.getComponent(RigidBody);
            if (rigid)
                rigid.destroy();
            const collider = element.getComponent(Collider);
            if (collider)
                collider.destroy();//.enabled = false;
        });
    }

    thowRope(chainLength:number) {
        if (this.ropeGroup && this.chainPrefab) {
            this.ropeGroup.active = true;

            const pos = Vec3.ZERO.clone();

            let prevRigidChain:RigidBody = null;

            const chainCount = Math.floor(chainLength / GoldController.CHAIN_LENGTH);
            for (let index = 0; index < chainCount; index++) {
                const element = index < this.ropeGroup.children.length ? this.ropeGroup.children[index] : instantiate(this.chainPrefab);
                if (element) {
                    element.setParent(this.ropeGroup);

                    const p2p:PointToPointConstraint = element.getComponent(PointToPointConstraint);
                    p2p.connectedBody = prevRigidChain;

                    prevRigidChain = element.getComponent(RigidBody);
                    prevRigidChain.enabled = true;

                    if (index % 2) {
                        element.setRotationFromEuler(0, 90, 0);
                    }

                    if (index == chainCount - 1) {
                        element.addComponent(PointToPointConstraint);
                        pos.y = -GoldController.CHAIN_Y * 0.2;
                    }

                    pos.z -= GoldController.CHAIN_LENGTH;
                    element.setPosition(pos);
                }
            }

            for (let index = chainCount; index < this.ropeGroup.children.length; index++) {
                const element = this.ropeGroup.children[index];
                element.removeFromParent();
                element.destroy();
            }
        }
    }

    hideRope() {
        if (this.ropeGroup) {
            this.ropeGroup.removeAllChildren();
            this.ropeGroup.active = false;
        }
    }
}



import { _decorator, Collider, Component, instantiate, Mesh, MeshCollider, MeshRenderer, Node, ParticleSystem, PointToPointConstraint, Prefab, Quat, RigidBody, tween, Vec3 } from 'cc';
const { ccclass, property } = _decorator;

@ccclass('GoldController')
export class GoldController extends Component {
    @property(ParticleSystem)
    vfx:ParticleSystem = null;

    @property(Prefab)
    chainPrefab:Prefab = null;

    @property(Node)
    ropeGroup:Node = null;

    @property(ParticleSystem)
    vfxFactory:ParticleSystem[] = [];

    public static CHAIN_LENGTH:number = 0.3;
    public static CHAIN_Y:number = 2.4;

    protected _meshRenderer:MeshRenderer = null;
    protected _meshCollider:MeshCollider = null;
    protected _rigid:RigidBody = null;

    protected _tempPos:Vec3 = Vec3.ZERO.clone();
    protected _tempQuat:Quat = Quat.IDENTITY.clone();

    protected _chainLength:number = 0;

    protected onLoad(): void {
        this._meshRenderer = this.getComponent(MeshRenderer);
        this._meshCollider = this.getComponent(MeshCollider);
        this._rigid = this.getComponent(RigidBody);
    }

    follow(node:Node) {
        this.node.getWorldPosition(this._tempPos);
        this.node.getWorldRotation(this._tempQuat);

        if (node) {
            this.node.setParent(node);

            if (this._rigid)
                this._rigid.enabled = false;

            this.ropeGroup.children.forEach(element => {
                element.getComponents(PointToPointConstraint).forEach(p2p => {
                    p2p.destroy();//.enabled = false;
                });
                element.getComponent(RigidBody).destroy();//.enabled = false;
                element.getComponent(Collider).destroy();//.enabled = false;
            });
        } else {
            this.node.setParent(this.node.parent.parent);
        }
        this.node.setWorldPosition(this._tempPos);
        this.node.setWorldRotation(this._tempQuat);
    }

    getChainLength() : number {
        return this._chainLength;
    }

    setParam(mesh:Mesh, worldPos:Vec3, chainLength:number, ropeGroupWorldPos:Vec3) {
        this.node.active = true;

        this._chainLength = chainLength;

        if (this._meshRenderer)
            this._meshRenderer.mesh = mesh;
        if (this._meshCollider)
            this._meshCollider.mesh = mesh;

        this.node.setWorldPosition(worldPos);
        this.node.setWorldRotation(Quat.IDENTITY);

        if (this.vfx)
            this.vfx.play();

        if (this._rigid)
            this._rigid.enabled = true;

        if (this.ropeGroup && this.chainPrefab && chainLength > 0) {
            this.ropeGroup.active = true;

            const pos = Vec3.ZERO.clone();

            ropeGroupWorldPos.y = GoldController.CHAIN_Y;
            this.ropeGroup.setWorldPosition(ropeGroupWorldPos);

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

                    pos.x -= GoldController.CHAIN_LENGTH;
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
        if (this.vfx)
            this.vfx.stop();

        if (this.ropeGroup) {
            this.ropeGroup.removeAllChildren();
            this.ropeGroup.active = false;
        }
    }

    hideGold() {
        if (this.vfxFactory.length)
            this.vfxFactory.forEach(element => {
                element.play();
            });

        tween(this.node)
        .to(0.5, {scale:Vec3.ZERO})
        .call(() => {
            this.node.setScale(Vec3.ONE);
            this.node.active = false;
            // if (this.vfxFactory.length)
            //     this.vfxFactory.forEach(element => {
            //         element.stop();
            //     });
        })
        .start();
    }

    start() {
        this.node.active = false;
    }

    // update(deltaTime: number) {
    //     if (this._followNode) {

    //     }
    // }
}



import { ActorPF2e } from "@actor";
import { ItemPF2e } from "@item";
import { TokenDocumentPF2e } from "@scene";
import { ErrorPF2e, sluggify } from "@util";
import { EffectBadge } from "./data";

/** Base effect type for all PF2e effects including conditions and afflictions */
export abstract class AbstractEffectPF2e extends ItemPF2e {
    /** A normalized version of the slug that shows in roll options, removing certain prefixes */
    rollOptionSlug!: string;

    abstract get badge(): EffectBadge | null;

    abstract increase(): Promise<void>;
    abstract decrease(): Promise<void>;

    /** Get the actor that created this effect */
    get origin(): { actor: ActorPF2e | null; item: Embedded<ItemPF2e> | null } {
        const [actorOrToken, item] = this.isOfType("affliction", "effect")
            ? [
                  fromUuidSync(this.system.context?.origin.actor ?? ""),
                  fromUuidSync(this.system.context?.origin.item ?? ""),
              ]
            : [null, null];

        const actor =
            actorOrToken instanceof ActorPF2e
                ? actorOrToken
                : actorOrToken instanceof TokenDocumentPF2e
                ? actorOrToken.actor
                : null;

        return {
            actor,
            item: item instanceof ItemPF2e ? (item as Embedded<ItemPF2e>) : null,
        };
    }

    /** If true, the AbstractEffect should be hidden from the user unless they are a GM */
    get unidentified(): boolean {
        return false;
    }

    override prepareBaseData(): void {
        super.prepareBaseData();

        const slug = this.slug ?? sluggify(this.name);
        this.rollOptionSlug = slug.replace(/^(?:[a-z]+-)?(?:effect|stance)-/, "");
    }

    /** Set a self roll option for this effect */
    override prepareActorData(): void {
        const actor = this.actor;
        if (!actor) throw ErrorPF2e("prepareActorData called from unembedded item");

        actor.rollOptions.all[`self:${this.type}:${this.rollOptionSlug}`] = true;

        // Add the badge value to roll options but only if it is a number and the highest value
        const badge = this.badge;
        if (typeof badge?.value === "number") {
            const otherEffects = actor.items.filter(
                (i): i is Embedded<AbstractEffectPF2e> =>
                    i instanceof AbstractEffectPF2e && i.rollOptionSlug === this.rollOptionSlug
            );
            const values = otherEffects
                .map((effect) => effect.badge?.value)
                .filter((value): value is number => typeof value === "number");
            if (badge.value >= Math.max(...values)) {
                actor.rollOptions.all[`self:${this.type}:${this.rollOptionSlug}:${badge.value}`] = true;
            }
        }
    }
}

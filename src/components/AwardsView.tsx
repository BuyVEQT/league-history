import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  Brush,
  ClipboardList,
  Clover,
  Crown,
  Flame,
  HeartCrack,
  Rocket,
  Route,
  Shield,
  Star,
  Target,
  Trophy,
  Waves,
  Zap,
} from "lucide-react";
import { Avatar, ManagerLink, PageTitle, Section } from "@/components/ui";
import { allTimeAwards, seasonAwards, type Award } from "@/lib/analytics/awards";
import type { League, Season } from "@/lib/types";

const ICONS: Record<Award["icon"], typeof Trophy> = {
  trophy: Trophy,
  star: Star,
  rocket: Rocket,
  heart: HeartCrack,
  horseshoe: Clover,
  wave: Waves,
  broom: Brush,
  crown: Crown,
  road: Route,
  swap: ArrowLeftRight,
  target: Target,
  basement: ArrowDownToLine,
  shield: Shield,
  flame: Flame,
  bolt: Zap,
  clip: ClipboardList,
};

function AwardGrid({ awards, league }: { awards: Award[]; league: League }) {
  const nameOf = (id: string) => league.managers.find((m) => m.id === id)?.name ?? id;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {awards.map((a) => {
        const Icon = ICONS[a.icon];
        return (
          <div key={a.title} className={`panel award p-4 ${a.gold ? "gold" : ""}`}>
            <div className="ic">
              <Icon className="size-[22px]" aria-hidden />
            </div>
            <div className="min-w-0">
              <div className="award-k">{a.title}</div>
              <div className="award-v">{a.value}</div>
              <div className="mt-1.5 flex flex-wrap gap-2.5">
                {a.winners.map((id) => (
                  <span key={id} className="inline-flex items-center gap-2 text-sm font-semibold">
                    <Avatar size="sm" name={nameOf(id)} />
                    <ManagerLink id={id} name={nameOf(id)} />
                  </span>
                ))}
              </div>
              {a.detail && <div className="mt-1 text-[13.5px] text-[color:var(--ink-2)]">{a.detail}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** The Awards page: all-time superlatives plus one season's, with a season picker. */
export function AwardsView({ league, slug, season }: { league: League; slug: string; season: Season }) {
  return (
    <>
      <PageTitle
        eyebrow="Awards"
        title="Hardware for everyone"
        subtitle="Superlatives for every season and for all time, each earned from the numbers on the rest of the site."
      />
      <Section title="All-time">
        <AwardGrid awards={allTimeAwards(league)} league={league} />
      </Section>
      <Section title={`${season.label} season`}>
        <nav aria-label="Awards by season" className="flex flex-wrap gap-1.5">
          {league.seasons.map((s) => (
            <Link key={s.year} href={`/${slug}/awards/${s.year}`} aria-current={s.year === season.year ? "page" : undefined} className="pill">
              {s.label}
            </Link>
          ))}
        </nav>
        <AwardGrid awards={seasonAwards(league, season)} league={league} />
      </Section>
    </>
  );
}

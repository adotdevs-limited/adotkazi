"use client";

import { useActionState } from "react";

import {
  createOpportunityAction,
  updateOpportunityAction,
  type OpportunityActionState,
} from "@/domains/recruitment/opportunities/opportunity.actions";
import {
  EXPERIENCE_LEVEL_OPTIONS,
  OPPORTUNITY_TYPE_OPTIONS,
  OPPORTUNITY_VISIBILITY_OPTIONS,
  WORKPLACE_TYPE_OPTIONS,
} from "@/domains/recruitment/opportunities/opportunity.schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const SELECT_CLASS =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 h-8 rounded-lg border bg-transparent px-2.5 text-sm outline-none focus-visible:ring-3";
const TEXTAREA_CLASS =
  "border-input focus-visible:border-ring focus-visible:ring-ring/50 min-h-24 w-full rounded-lg border bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:ring-3";

const OPTION_LABELS: Record<string, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  INDUSTRIAL_PRACTICAL_TRAINING: "Industrial practical training (IPT)",
  GRADUATE_PROGRAM: "Graduate program",
  APPRENTICESHIP: "Apprenticeship",
  VOLUNTEER: "Volunteer",
  ON_SITE: "On-site",
  REMOTE: "Remote",
  HYBRID: "Hybrid",
  ENTRY: "Entry",
  JUNIOR: "Junior",
  MID: "Mid",
  SENIOR: "Senior",
  LEAD: "Lead",
  EXECUTIVE: "Executive",
  PUBLIC: "Public",
  ORGANIZATION_ONLY: "Organization only",
  INVITATION_ONLY: "Invitation only",
  PRIVATE_DRAFT: "Private draft",
};

export type OpportunityFormDefaultValues = {
  id: string;
  title: string;
  slug: string;
  departmentId: string;
  branchId: string;
  pipelineId: string;
  opportunityType: string;
  workplaceType: string;
  experienceLevel: string;
  location: string;
  openings: number;
  salaryMin: string;
  salaryMax: string;
  currency: string;
  applicationDeadline: string;
  description: string;
  responsibilities: string;
  requirements: string;
  benefits: string;
  visibility: string;
  skills: string;
};

export function OpportunityForm({
  mode,
  departments,
  branches,
  pipelines,
  defaultValues,
}: {
  mode: "create" | "edit";
  departments: Array<{ id: string; name: string }>;
  branches: Array<{ id: string; name: string }>;
  pipelines: Array<{ id: string; name: string }>;
  defaultValues?: Partial<OpportunityFormDefaultValues>;
}) {
  const initialState: OpportunityActionState = { error: null };
  const [state, formAction, isPending] = useActionState(
    mode === "create" ? createOpportunityAction : updateOpportunityAction,
    initialState,
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>{mode === "create" ? "New opportunity" : "Edit opportunity"}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="grid gap-4">
          {mode === "edit" && <input type="hidden" name="id" value={defaultValues?.id} />}

          <div className="grid gap-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              name="title"
              required
              defaultValue={defaultValues?.title}
              placeholder="Senior Software Engineer"
            />
            {state.fieldErrors?.title && (
              <p className="text-destructive text-sm">{state.fieldErrors.title}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="slug">Slug</Label>
            <Input
              id="slug"
              name="slug"
              required
              defaultValue={defaultValues?.slug}
              placeholder="senior-software-engineer"
            />
            {state.fieldErrors?.slug && (
              <p className="text-destructive text-sm">{state.fieldErrors.slug}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="departmentId">Department</Label>
              <select
                id="departmentId"
                name="departmentId"
                required
                defaultValue={defaultValues?.departmentId ?? ""}
                className={SELECT_CLASS}
              >
                <option value="" disabled>
                  Select a department
                </option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </select>
              {state.fieldErrors?.departmentId && (
                <p className="text-destructive text-sm">{state.fieldErrors.departmentId}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="branchId">Branch</Label>
              <select
                id="branchId"
                name="branchId"
                defaultValue={defaultValues?.branchId ?? ""}
                className={SELECT_CLASS}
              >
                <option value="">No specific branch</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="opportunityType">Type</Label>
              <select
                id="opportunityType"
                name="opportunityType"
                required
                defaultValue={defaultValues?.opportunityType ?? ""}
                className={SELECT_CLASS}
              >
                <option value="" disabled>
                  Select a type
                </option>
                {OPPORTUNITY_TYPE_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {OPTION_LABELS[value]}
                  </option>
                ))}
              </select>
              {state.fieldErrors?.opportunityType && (
                <p className="text-destructive text-sm">{state.fieldErrors.opportunityType}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="workplaceType">Workplace</Label>
              <select
                id="workplaceType"
                name="workplaceType"
                required
                defaultValue={defaultValues?.workplaceType ?? ""}
                className={SELECT_CLASS}
              >
                <option value="" disabled>
                  Select a workplace type
                </option>
                {WORKPLACE_TYPE_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {OPTION_LABELS[value]}
                  </option>
                ))}
              </select>
              {state.fieldErrors?.workplaceType && (
                <p className="text-destructive text-sm">{state.fieldErrors.workplaceType}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="experienceLevel">Experience level</Label>
              <select
                id="experienceLevel"
                name="experienceLevel"
                defaultValue={defaultValues?.experienceLevel ?? ""}
                className={SELECT_CLASS}
              >
                <option value="">Any level</option>
                {EXPERIENCE_LEVEL_OPTIONS.map((value) => (
                  <option key={value} value={value}>
                    {OPTION_LABELS[value]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                defaultValue={defaultValues?.location}
                placeholder="Dar es Salaam, Tanzania"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="openings">Openings</Label>
              <Input
                id="openings"
                name="openings"
                type="number"
                min={1}
                defaultValue={defaultValues?.openings ?? 1}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="applicationDeadline">Application deadline</Label>
              <Input
                id="applicationDeadline"
                name="applicationDeadline"
                type="date"
                defaultValue={defaultValues?.applicationDeadline}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="salaryMin">Salary min</Label>
              <Input
                id="salaryMin"
                name="salaryMin"
                type="number"
                defaultValue={defaultValues?.salaryMin}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="salaryMax">Salary max</Label>
              <Input
                id="salaryMax"
                name="salaryMax"
                type="number"
                defaultValue={defaultValues?.salaryMax}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="currency">Currency</Label>
              <Input
                id="currency"
                name="currency"
                maxLength={3}
                defaultValue={defaultValues?.currency}
                placeholder="TZS"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="pipelineId">Pipeline</Label>
            <select
              id="pipelineId"
              name="pipelineId"
              defaultValue={defaultValues?.pipelineId ?? ""}
              className={SELECT_CLASS}
            >
              <option value="">Use the organization&apos;s default pipeline</option>
              {pipelines.map((pipeline) => (
                <option key={pipeline.id} value={pipeline.id}>
                  {pipeline.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="visibility">Visibility</Label>
            <select
              id="visibility"
              name="visibility"
              defaultValue={defaultValues?.visibility ?? "PUBLIC"}
              className={SELECT_CLASS}
            >
              {OPPORTUNITY_VISIBILITY_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {OPTION_LABELS[value]}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="skills">Skills</Label>
            <Input
              id="skills"
              name="skills"
              defaultValue={defaultValues?.skills}
              placeholder="TypeScript, React, PostgreSQL"
            />
            <p className="text-muted-foreground text-xs">Comma-separated.</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              name="description"
              defaultValue={defaultValues?.description}
              className={TEXTAREA_CLASS}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="responsibilities">Responsibilities</Label>
            <textarea
              id="responsibilities"
              name="responsibilities"
              defaultValue={defaultValues?.responsibilities}
              className={TEXTAREA_CLASS}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="requirements">Requirements</Label>
            <textarea
              id="requirements"
              name="requirements"
              defaultValue={defaultValues?.requirements}
              className={TEXTAREA_CLASS}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="benefits">Benefits</Label>
            <textarea
              id="benefits"
              name="benefits"
              defaultValue={defaultValues?.benefits}
              className={TEXTAREA_CLASS}
            />
          </div>

          {state.error && <p className="text-destructive text-sm">{state.error}</p>}

          <Button type="submit" disabled={isPending} className="w-full">
            {isPending
              ? mode === "create"
                ? "Creating…"
                : "Saving…"
              : mode === "create"
                ? "Create opportunity"
                : "Save changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

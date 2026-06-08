import { useAuth } from "@/features/auth/AuthContext";

const EMPTY_PROPERTY_IDS: string[] = [];

export const useManagerScope = () => {
  const {
    user,
    isManager,
    isAgency,
    isSubmanager,
    submanagerPermissions,
  } = useAuth();

  const managerId = isSubmanager
    ? submanagerPermissions?.manager_id ?? null
    : isManager || isAgency
      ? user?.id ?? null
      : null;

  const restrictToAssignedProperties =
    isSubmanager && !!submanagerPermissions?.restrict_to_assigned_properties;

  return {
    managerId,
    isReady: !!managerId,
    restrictToAssignedProperties,
    assignedPropertyIds: restrictToAssignedProperties
      ? submanagerPermissions?.assigned_property_ids ?? []
      : EMPTY_PROPERTY_IDS,
  };
};

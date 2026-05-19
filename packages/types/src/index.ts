/**
 * Tüm runtime tipleri @yemek-takip/validators'tan re-export edilir.
 * Bu package tek bir noktadan tüm tipleri tüketmek isteyenler için convenience layer.
 */
export type {
  // auth
  RegisterInput,
  LoginInput,
  RefreshInput,
  AuthTokens,
  // user
  Sex,
  ActivityLevel,
  UserProfile,
  Streak,
  PublicUser,
  UpdateProfileInput,
  // meal
  MealType,
  Macros,
  MealItem,
  Meal,
  CreateMealInput,
  UpdateMealInput,
  UpdateMealItemInput,
  AiMealItem,
  AiMealAnalysis,
  // activity
  Intensity,
  ActivityItem,
  Activity,
  CreateActivityInput,
  UpdateActivityInput,
  AiActivityItem,
  AiActivityAnalysis,
  // weight
  WeightEntry,
  CreateWeightInput,
  WeightPeriod,
  // water
  WaterEntry,
  CreateWaterInput,
  // stats
  DailyStats,
  RangeGranularity,
  StreakStats,
  // uploads
  UploadFolder,
  SignUploadInput,
  SignUploadOutput,
  // common
  ObjectId,
  LocalDate,
  ApiError,
  ApiResponse,
} from '@yemek-takip/validators';

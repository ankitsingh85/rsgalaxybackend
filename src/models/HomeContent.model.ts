import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IHeroStat {
  value: string;
  label: string;
}

export interface IAboutFeature {
  icon: string;
  title: string;
  subtitle: string;
}

export interface IAmenityItem {
  icon: string;
  label: string;
}

export interface IOfferBanner {
  image: string;
  title: string;
  subtitle: string;
  link?: string;
}

export interface IHomeContent extends Document {
  // ── Hero banner ──
  heroImage: string;
  heroTagline: string;
  heroHeadline: string;
  heroHeadlineHighlight: string;
  heroStats: IHeroStat[];

  // ── About section ──
  aboutEyebrow: string;
  aboutHeadline: string;
  aboutHeadlineHighlight: string;
  aboutDescription: string;
  aboutImageMain: string;
  aboutImageTopRight: string;
  aboutImageBottomRight: string;
  aboutBadgeValue: string;
  aboutBadgeLabel: string;
  aboutFeatures: IAboutFeature[];
  aboutCtaText: string;
  aboutCtaLink: string;

  // ── Amenities section ──
  amenitiesEyebrow: string;
  amenitiesHeadline: string;
  amenities: IAmenityItem[];

  // ── Home page offers slider ──
  offerBanners: IOfferBanner[];

  updatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const heroStatSchema = new Schema<IHeroStat>(
  { value: { type: String, required: true, trim: true, maxlength: 20 }, label: { type: String, required: true, trim: true, maxlength: 40 } },
  { _id: false }
);

const aboutFeatureSchema = new Schema<IAboutFeature>(
  {
    icon: { type: String, required: true, trim: true, maxlength: 40 },
    title: { type: String, required: true, trim: true, maxlength: 60 },
    subtitle: { type: String, trim: true, maxlength: 60 },
  },
  { _id: false }
);

const amenityItemSchema = new Schema<IAmenityItem>(
  { icon: { type: String, required: true, trim: true, maxlength: 40 }, label: { type: String, required: true, trim: true, maxlength: 40 } },
  { _id: false }
);

const offerBannerSchema = new Schema<IOfferBanner>(
  {
    image: { type: String, required: true },
    title: { type: String, trim: true, maxlength: 80, default: '' },
    subtitle: { type: String, trim: true, maxlength: 140, default: '' },
    link: { type: String, trim: true, maxlength: 200, default: '' },
  },
  { _id: false }
);

const homeContentSchema = new Schema<IHomeContent>(
  {
    heroImage: { type: String, default: 'https://images.pexels.com/photos/14917401/pexels-photo-14917401.jpeg?w=1920' },
    heroTagline: { type: String, trim: true, maxlength: 120, default: '✦ Five Star Luxury · Always With You ✦' },
    heroHeadline: { type: String, trim: true, maxlength: 120, default: 'Where Every Stay Becomes' },
    heroHeadlineHighlight: { type: String, trim: true, maxlength: 60, default: 'a Memory' },
    heroStats: {
      type: [heroStatSchema],
      default: [
        { value: '2+', label: 'Hotels' },
        { value: '10K+', label: 'Guests' },
        { value: '2', label: 'Destinations' },
        { value: '4.9★', label: 'Rating' },
      ],
    },

    aboutEyebrow: { type: String, trim: true, maxlength: 60, default: 'About RS Galaxy Hotel' },
    aboutHeadline: { type: String, trim: true, maxlength: 120, default: 'Luxury Redefined,' },
    aboutHeadlineHighlight: { type: String, trim: true, maxlength: 60, default: 'Always With You' },
    aboutDescription: {
      type: String,
      trim: true,
      maxlength: 500,
      default: "Founded in 2022, RS Galaxy Hotel is India's most celebrated luxury hotel brand — blending 5-star global standards with warm Indian hospitality across Goa & Rishikesh.",
    },
    aboutImageMain: { type: String, default: 'https://images.pexels.com/photos/33824477/pexels-photo-33824477.jpeg?w=600' },
    aboutImageTopRight: { type: String, default: 'https://images.pexels.com/photos/2725675/pexels-photo-2725675.jpeg?w=420' },
    aboutImageBottomRight: { type: String, default: 'https://images.pexels.com/photos/12387869/pexels-photo-12387869.jpeg?w=420' },
    aboutBadgeValue: { type: String, trim: true, maxlength: 20, default: '2+' },
    aboutBadgeLabel: { type: String, trim: true, maxlength: 40, default: 'Yrs Excellence' },
    aboutFeatures: {
      type: [aboutFeatureSchema],
      default: [
        { icon: 'Trophy', title: 'Award-Winning', subtitle: '50+ awards' },
        { icon: 'Heart', title: '10K+ Guests', subtitle: 'Yearly' },
        { icon: 'Star', title: '5-Star Rated', subtitle: 'All properties' },
        { icon: 'Award', title: 'Best Service', subtitle: 'Certified' },
      ],
    },
    aboutCtaText: { type: String, trim: true, maxlength: 40, default: 'Explore Hotels' },
    aboutCtaLink: { type: String, trim: true, maxlength: 200, default: '/hotels' },

    amenitiesEyebrow: { type: String, trim: true, maxlength: 60, default: 'Premium Amenities' },
    amenitiesHeadline: { type: String, trim: true, maxlength: 120, default: 'Everything You Need' },
    amenities: {
      type: [amenityItemSchema],
      default: [
        { icon: 'Wifi', label: 'Free WiFi' },
        { icon: 'Car', label: 'Free Parking' },
        { icon: 'Utensils', label: 'Fine Dining' },
        { icon: 'Dumbbell', label: 'Fitness Center' },
        { icon: 'Coffee', label: '24/7 Room Service' },
        { icon: 'Bath', label: 'Spa & Wellness' },
      ],
    },

    // Admin can upload any number of slides — normalizePayload caps it at 20; the public
    // slider shows 3 at a time and auto-advances through the rest one by one.
    offerBanners: { type: [offerBannerSchema], default: [] },

    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

const HomeContent: Model<IHomeContent> =
  mongoose.models.HomeContent || mongoose.model<IHomeContent>('HomeContent', homeContentSchema);

export default HomeContent;

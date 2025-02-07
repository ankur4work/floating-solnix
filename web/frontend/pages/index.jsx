import React from "react";


import {
  Card,
  Page,
  Layout,
  TextContainer,
  Button,
  Modal,
  Icon,
  DataTable,
  MediaCard,
  Frame,
  TopBar,
  CalloutCard,
  VideoThumbnail
} from "@shopify/polaris";


import { useState, useCallback } from 'react';
import { useAppQuery, useAuthenticatedFetch } from "../hooks";
import { DisplayText } from "@shopify/polaris";
import { ThemeValidate } from "../components/ThemeSelection";
import { ActiveSubscription } from "../components/ActiveSubscriptionCheck";
import { shopifyBackground } from "../assets";
import ReactPlayer from "react-player";
import {
  ExternalMinor,
  CircleTickMinor, HomeMajor,ChecklistMajor
} from '@shopify/polaris-icons';

import { useNavigate } from "react-router-dom";
import { Redirect } from "@shopify/app-bridge/actions";
import { useAppBridge } from "@shopify/app-bridge-react";
import { Toast } from "@shopify/app-bridge-react";
import { Iconkeyfeature } from "../components/Iconkeyfeature";
import { TotalWishlists } from "../components/TotalWishlists";




export default function HomePage() {
  const emptyToastProps = { content: null };
  const [isLoadingSubscribe, setIsLoadingSubscribe] = useState(false);
  const [isLoadingCancelSubscribe, setIsLoadingCancelSubscribe] = useState(false);

  const [active, setActive] = useState(false);
  const [activelookbook, setActiveLookbook] = useState(false);
  const [activefeed, setActiveFeed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const handleChange = useCallback(() => setActive(!active), [active]);

  const app = useAppBridge();
  const fetch = useAuthenticatedFetch();
  const redirect = Redirect.create(app);

  const [toastProps, setToastProps] = useState(emptyToastProps);
  const activator = <Button onClick={handleChange}>Quick Setup Guide</Button>;


  const {
    data,
  } = useAppQuery({
    url: "/api/getshop",
  });

  const { data: storeDetailsData } = useAppQuery({
    url: "/api/store-details",
  });

  const template = 'index'; // Replace with your actual template value
  const uuid = '034c80a8-690a-411d-b205-8a6380c5a10d'; // Replace with your actual UUID
  const handlePaid = 'wishlist_app_embed'; // Replace with your actual handle
  const handleFree = 'meroxio_sticky_mobile_free';
  const reviewUrl = "https://apps.shopify.com/meroxio-comparison-slider#modal-show=WriteReviewModal"


  function openThemeEditor() {
    console.log("Shop: " + data?.shop);
    const url = `https://${data?.shop}/admin/themes/current/editor?context=apps&template=${template}&activateAppId=${uuid}/${handlePaid}`;
    window.open(url);
  }

  function enableFreePlan() {
    const url = `https://${data?.shop}/admin/themes/current/editor?context=apps&template=${template}&activateAppId=${uuid}/${handleFree}`;
    window.open(url);
  }

  function openReviewPage() {
    window.open(reviewUrl);
  }

  async function subscribePlan() {
    setIsLoadingSubscribe(true);
    const res = await fetch("/api/createSubscription"); //fetch instance of userLoggedInFetch(app)
    const data = await res.json();
    setIsLoadingSubscribe(false);
    if (data.error) {
      console.log(data.error);
      setToastProps({ content: "Redirecting to payment page..", error: true });
    } else if (data.confirmationUrl) {
      const { confirmationUrl } = data;
      setToastProps({ content: "Redirecting to payment page.." });
      redirect.dispatch(Redirect.Action.REMOTE, confirmationUrl);
    } else if (data.isActiveSubscription) {
      console.log("Already subscribed")
      setToastProps({ content: "You already have a active subscription" });
    }
  }


  async function cancelSubscription() {
    setIsLoadingCancelSubscribe(true);
    const res = await fetch("/api/cancelSubscription"); //fetch instance of userLoggedInFetch(app)
    const data = await res.json();
    setIsLoadingCancelSubscribe(false);
    console.log(data.status);
    if (data.status === "CANCELLED") {
      setToastProps({ content: "Successfully Cancelled the subscription" });
      window.location.reload();
    } else {
      setToastProps({ content: "Failed to cancel the subscription" });
    }

  }


  const toastMarkup = toastProps.content && (
    <Toast {...toastProps} onDismiss={() => setToastProps(emptyToastProps)} />
  );


  const tickIcon = <Icon
    source={CircleTickMinor}
    color="success"
  />


  const rows = [
    ['Cost', 'Free', '$4.49/month'],
    ['Limit on Wishlist Products', '2 Products', 'Unlimited'],
    ['Move to Wishlist Button in Cart', tickIcon, tickIcon],
    ['Wishlist Icon on Every Product Card', tickIcon, tickIcon],
    ['Product Page Add To Wishlist', tickIcon, tickIcon],
    ['NO Powered By MeroxIO Bar', '-', tickIcon],
    ['No Show MeroxIO Logo in Product Grid', '-', tickIcon],
    ['Add to Cart Button', '-', tickIcon],
    ['Variant Selection for Wishlist Items', '-', tickIcon],
    ['Priority Email/Chat Support', '-', tickIcon]
  ];
  

  // m-hearder-part-starting

  const navigate = useNavigate();

  const logo = {

    width: 450,
    height: 90,

    topBarSource:
      `https://cdn.shopify.com/s/files/1/0908/8562/0025/files/MeroxIO_Comparison_Slider_2.png?v=1738650835`,
    url: '/',
    accessibilityLabel: 'https://cdn.shopify.com/s/files/1/0571/4372/2059/files/MeroxIO.png?v=1734519087',

  };

  const gotoHomePage = () => {
    navigate("/");
  }
  
  const gotoInstallPage = () => {
    navigate("/install");

}
  
  

  const secondaryMenuMarkup = (
    <TopBar.Menu
      activatorContent={
                <div className="main-icon">
                    <div className="main-icon-1"><Button onClick={gotoHomePage} plain monochrome removeUnderline fullWidth >
                        <div className="m-icon-show-1"><Icon source={HomeMajor} /><span className="m-hover-text-1"> <h1>Home</h1></span></div></Button>

                    </div>

                    <div className="main-icon-2"><Button onClick={gotoInstallPage} plain monochrome removeUnderline fullWidth >
                        <div className="m-icon-show-2"><Icon source={ChecklistMajor} /><span className="m-hover-text-2"> <h1>Installation</h1></span></div></Button>

                    </div>

                </div>
      }

    />
  );





  const topBarMarkup = (
    <TopBar
      secondaryMenu={secondaryMenuMarkup}

    />
  );



  return (
    <Frame topBar={topBarMarkup} logo={logo} >
      <Page>
        {toastMarkup}
        <Layout>
          <Layout.Section>
            <div className="custom-callout-container">
              <CalloutCard
                title="Activate Floating Cart Button"
                illustration="https://cdn.shopify.com/s/assets/admin/checkout/settings-customizecart-705f57c725ac05be5a34ec20c05b94298cb8afd10aac7bd9c7ad02030f48cfa0.svg"
                primaryAction={{ content: 'Activate Now ➡️', onAction: openThemeEditor, accessibilityLabel: 'Enable Now - Premium Plan' }}
                // secondaryAction={{content: 'Activate Now - Free Plan ➡️', onAction: enableFreePlan, accessibilityLabel: 'Enable Now - Free Plan'}}
              >
          <p>
       Ready to enhance your store's cart experience? Click 'Enable' to activate the Floating Cart Button. Once enabled, customize the settings to match your store's design and provide a seamless shopping experience for your mobile customers. Make checkout easier and more accessible today!
          </p>
              </CalloutCard>
            </div>
          </Layout.Section>
          <Layout.Section>

            <TextContainer>
              <DisplayText size="Large"><span>Introduction</span></DisplayText>

              <p>🚀 Welcome to Floating Cart Button by MeroxIO! Transform your Shopify store with a seamless, intuitive, and mobile-friendly cart experience. Our smart floating cart button ensures effortless shopping by providing real-time cart updates, instant access, and automatic currency adaptation. Elevate your store’s engagement and boost conversions today!</p>

              <h2><b>Key Features:</b></h2>
              <ul className="appFeatures">
                <li><strong>✅ Live Cart Updates – </strong> Display total cart quantity in real-time for a transparent shopping experience.</li>
                <li><strong>✅ Quick Cart Access – </strong> Instantly open the cart drawer or cart page with just a tap.</li>
                <li><strong>✅ Mobile-Optimized –</strong>Designed exclusively for mobile users to enhance usability.</li>
                <li><strong>✅ Automatic Currency Adaptation –</strong> Ensures a smooth shopping experience for global customers.</li>
                <li><strong>✅ User-Friendly & Engaging – </strong> Keeps customers focused on shopping without friction.
                </li>
                <li><strong>✅ Direct Quantity & Price Display -</strong> nstantly show total cart quantity and price, saving time for customers. </li>
               
              </ul>



            </TextContainer>

            <div style={{ display: "flex" }}>


              <Modal
                activator={activator}
                open={active}
                onClose={handleChange}
                title="Quick Setup in 2.0 themes"
              >
                <Modal.Section>
                  <div>

                    <div style={{ padding: '56% 0 0 0', position: 'relative' }}><iframe src="https://cdn.shopify.com/videos/c/o/v/d7060f8e052243f1a404e3c8562c7803.mp4" frameBorder="0" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen style={{ position: 'absolute', top: '0', left: '0', width: '100%', height: '100%' }} title="Quick Setup"></iframe></div>
                  </div>
                </Modal.Section>
              </Modal>


              {/* <Button plain onClick={openThemeEditor} style={{ marginLeft: "auto" }}>
                <div className="appEnableBtn"><span>Enable Now</span>
                  <Icon
                    source={ExternalMinor}
                    color="base"
                  /></div>
              </Button> */}
            </div>
          </Layout.Section>




          <Layout.Section secondary>
            <Card>
              <div className="videoWrapper" style={{ backgroundImage: `url(${shopifyBackground})`, padding: '22px' }}>
              <video
                  src="https://cdn.shopify.com/videos/c/o/v/9f176878242244b5a824915f62f4087b.mp4"
                  controls
                  autoPlay
                  loop
                  muted
                  playsInline
                  style={{ width: '100%', height: '100%' }}
                >
                  Your browser does not support the video tag.
                </video>

              </div>
            </Card>
          </Layout.Section>

          <Layout.Section>


{/* 
            <div className="planComparison">
              <Card title="Plan Comparison" sectioned

                primaryFooterAction={{
                  content: 'Subscribe to MeroxIO Premium',
                  onAction: () => {
                    subscribePlan()
                  },
                  loading: isLoadingSubscribe
                }}
                secondaryFooterActions={[{
                  content: 'Cancel Subscription',
                  onAction: () => {
                    cancelSubscription()
                  },
                  destructive: true,
                  loading: isLoadingCancelSubscribe
                }
                ]}
              >
                <DataTable
                  columnContentTypes={[
                    'text',
                    'text',
                    'text',
                  ]}
                  headings={[
                    'Features',
                    'Free version',
                    'MeroxIO Premium',
                  ]}
                  rows={rows}
                  increasedTableDensity
                  hasZebraStripingOnData
                  hoverable
                />
              </Card>
            </div> */}
          </Layout.Section>

          <Layout.Section>
          {/* <ActiveSubscription /> */}
        </Layout.Section>

          <Layout.Section>

            {/* <CalloutCard
              title="How is your experience with our app ?"
              illustration="https://cdn.shopify.com/s/files/1/0627/5727/3793/files/customer-review.gif?v=1668584409"
              primaryAction={{
                content: 'Leave a 5-Star Review',
                onAction: openReviewPage
              }}
            >
              <p>🌟"We're always striving to make our App better for you, and your feedback lights the way! 🚀 Your thoughts and experiences are invaluable to us. If you've enjoyed using our app, we'd be thrilled if you could share your positive experiences with a ⭐⭐⭐⭐⭐ review on the Shopify App Store. Your support not only motivates our team but also helps other merchants discover the benefits of our App! Thank you for being an amazing part of our journey!" 🙌</p>
            </CalloutCard> */}


          </Layout.Section>

        </Layout>



      </Page>

    </Frame>
  );
}



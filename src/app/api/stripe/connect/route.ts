// /pages/api/stripe/connect.ts

import { client } from "@/lib/prisma";
import { currentUser } from "@clerk/nextjs";
import { NextResponse } from "next/server";
import Stripe from "stripe";

// Initialize the Stripe client with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET!, {
  typescript: true,
  apiVersion: "2024-04-10",
});

export const GET = async () => {
  try {
    // Retrieve the currently authenticated user
    const user = await currentUser();
    if (!user)
      return new NextResponse("User not authenticated", { status: 401 });

    // Create a new Stripe account
    const account = await stripe.accounts.create({
      country: "US",
      type: "custom",
      business_type: "company",
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      external_account: "btok_us",
      tos_acceptance: {
        date: Math.floor(Date.now() / 1000),
        ip: "172.18.80.19", // Replace with user's actual IP if available
      },
    });

    if (account) {
      // Update the Stripe account with business profile and company information
      const approve = await stripe.accounts.update(account.id, {
        business_profile: {
          mcc: "5045",
          url: "https://bestcookieco.com",
        },
        company: {
          address: {
            city: "Fairfax",
            line1: "123 State St",
            postal_code: "22031",
            state: "VA",
          },
          tax_id: "000000000",
          name: "The Best Cookie Co",
          phone: "8888675309",
        },
      });

      if (approve) {
        // Create a person associated with the Stripe account
        const person = await stripe.accounts.createPerson(account.id, {
          first_name: "Jenny",
          last_name: "Rosen",
          relationship: {
            representative: true,
            title: "CEO",
          },
        });

        if (person) {
          // Update the person with additional information
          const approvePerson = await stripe.accounts.updatePerson(
            account.id,
            person.id,
            {
              address: {
                city: "Victoria",
                line1: "123 State St",
                postal_code: "V8P 1A1",
                state: "BC",
              },
              dob: {
                day: 10,
                month: 11,
                year: 1980,
              },
              ssn_last_4: "0000",
              phone: "8888675309",
              email: "jenny@bestcookieco.com",
              relationship: {
                executive: true,
              },
            }
          );

          if (approvePerson) {
            // Create another person (owner) associated with the Stripe account
            const owner = await stripe.accounts.createPerson(account.id, {
              first_name: "Kathleen",
              last_name: "Banks",
              email: "kathleen@bestcookieco.com",
              address: {
                city: "Victoria",
                line1: "123 State St",
                postal_code: "V8P 1A1",
                state: "BC",
              },
              dob: {
                day: 10,
                month: 11,
                year: 1980,
              },
              phone: "8888675309",
              relationship: {
                owner: true,
                percent_ownership: 80,
              },
            });

            if (owner) {
              // Finalize the account setup
              const complete = await stripe.accounts.update(account.id, {
                company: {
                  owners_provided: true,
                },
              });

              if (complete) {
                // Save the Stripe account ID to your database
                const saveAccountId = await client.user.update({
                  where: {
                    clerkId: user.id,
                  },
                  data: {
                    stripeId: account.id,
                  },
                });

                if (saveAccountId) {
                  // Create an account link for onboarding
                  const accountLink = await stripe.accountLinks.create({
                    account: account.id,
                    refresh_url:
                      "http://localhost:3000/callback/stripe/refresh",
                    return_url: "http://localhost:3000/callback/stripe/success",
                    type: "account_onboarding",
                    collection_options: {
                      fields: "currently_due",
                    },
                  });

                  // Return the URL for account onboarding
                  return NextResponse.json({ url: accountLink.url });
                }
              }
            }
          }
        }
      }
    }
  } catch (error) {
    console.error(
      "An error occurred when calling the Stripe API to create an account:",
      error
    );
    return new NextResponse("Internal Server Error", { status: 500 });
  }
};

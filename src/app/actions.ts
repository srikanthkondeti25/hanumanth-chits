"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import {
  getWhatsAppStatus,
  initWhatsAppClient,
  disconnectWhatsApp,
  broadcastToChitRecipients,
  sendDirectWhatsAppMessage,
} from "@/lib/whatsapp";
import { formatINR, formatDate } from "@/lib/formatters";


export async function addNewChitMember(data: {
  name: string;
  surname: string;
  phone: string;
  village: string;
  suretyName?: string;
  suretyPhone?: string;
  nomineeName?: string;
  nomineePhone?: string;
  nomineeRelation?: string;
  photo?: string;
  chitAmount: number;
  durationMonths: number;
  monthlyInstallment: number;
  startDate: string;
  previousDue?: number;
  notes?: string;
}) {
  try {
    const cleanPhone = data.phone.trim();
    const cleanName = data.name.trim();
    const cleanSurname = data.surname.trim();
    const cleanVillage = data.village.trim();

    // Check if member with this phone exists or create new
    let member = await prisma.chitMember.findFirst({
      where: { phone: cleanPhone },
    });

    if (member) {
      // Update member details
      member = await prisma.chitMember.update({
        where: { id: member.id },
        data: {
          name: cleanName,
          surname: cleanSurname,
          village: cleanVillage,
          suretyName: data.suretyName?.trim() || null,
          suretyPhone: data.suretyPhone?.trim() || null,
          nomineeName: data.nomineeName?.trim() || null,
          nomineePhone: data.nomineePhone?.trim() || null,
          nomineeRelation: data.nomineeRelation?.trim() || null,
          photo: data.photo || member.photo,
        },
      });
    } else {
      // Create new member
      member = await prisma.chitMember.create({
        data: {
          name: cleanName,
          surname: cleanSurname,
          phone: cleanPhone,
          village: cleanVillage,
          suretyName: data.suretyName?.trim() || null,
          suretyPhone: data.suretyPhone?.trim() || null,
          nomineeName: data.nomineeName?.trim() || null,
          nomineePhone: data.nomineePhone?.trim() || null,
          nomineeRelation: data.nomineeRelation?.trim() || null,
          photo: data.photo || null,
        },
      });
    }

    // Create the Chit record
    const chit = await prisma.chit.create({
      data: {
        memberId: member.id,
        chitAmount: Number(data.chitAmount),
        durationMonths: Number(data.durationMonths),
        monthlyInstallment: Number(data.monthlyInstallment),
        startDate: new Date(data.startDate),
        status: "ACTIVE",
        monthsCompleted: 0,
        totalPaid: 0,
        previousDue: Number(data.previousDue || 0),
        notes: data.notes?.trim() || null,
      },
    });

    revalidatePath("/");
    return { success: true, chitId: chit.id, memberName: `${member.name} ${member.surname}` };
  } catch (error: any) {
    console.error("Error adding chit member:", error);
    return { success: false, error: error.message || "Failed to create chit entry" };
  }
}

export async function createMember(data: {
  name: string;
  surname: string;
  phone: string;
  village: string;
  suretyName?: string;
  suretyPhone?: string;
  nomineeName?: string;
  nomineePhone?: string;
  nomineeRelation?: string;
  photo?: string;
}) {
  try {
    const cleanPhone = data.phone.trim();
    const cleanName = data.name.trim();
    const cleanSurname = data.surname.trim();
    const cleanVillage = data.village.trim();

    let member = await prisma.chitMember.findFirst({
      where: { phone: cleanPhone },
    });

    if (member) {
      member = await prisma.chitMember.update({
        where: { id: member.id },
        data: {
          name: cleanName,
          surname: cleanSurname,
          village: cleanVillage,
          suretyName: data.suretyName?.trim() || null,
          suretyPhone: data.suretyPhone?.trim() || null,
          nomineeName: data.nomineeName?.trim() || null,
          nomineePhone: data.nomineePhone?.trim() || null,
          nomineeRelation: data.nomineeRelation?.trim() || null,
          photo: data.photo || member.photo,
        },
      });
    } else {
      member = await prisma.chitMember.create({
        data: {
          name: cleanName,
          surname: cleanSurname,
          phone: cleanPhone,
          village: cleanVillage,
          suretyName: data.suretyName?.trim() || null,
          suretyPhone: data.suretyPhone?.trim() || null,
          nomineeName: data.nomineeName?.trim() || null,
          nomineePhone: data.nomineePhone?.trim() || null,
          nomineeRelation: data.nomineeRelation?.trim() || null,
          photo: data.photo || null,
        },
      });
    }

    revalidatePath("/");
    return { success: true, member };
  } catch (error: any) {
    console.error("Error creating member:", error);
    return { success: false, error: error.message || "Failed to save member" };
  }
}

export async function getAllMembers(searchQuery?: string) {
  try {
    const members = await prisma.chitMember.findMany({
      include: {
        chits: {
          select: {
            id: true,
            status: true,
            chitAmount: true,
            monthlyInstallment: true,
            previousDue: true,
            monthsCompleted: true,
            durationMonths: true,
          },
        },
        transactions: {
          select: {
            type: true,
            amount: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    let result = members.map((m) => {
      const activeChits = m.chits.filter((c) => c.status === "ACTIVE");
      const completedChits = m.chits.filter((c) => c.status === "COMPLETED");
      const totalDue = activeChits.reduce((acc, c) => acc + (c.previousDue || 0), 0);

      const totalTaken = m.transactions
        .filter((t) => t.type === "TAKEN")
        .reduce((sum, t) => sum + t.amount, 0);
      const totalGiven = m.transactions
        .filter((t) => t.type === "GIVEN")
        .reduce((sum, t) => sum + t.amount, 0);
      const netLedgerBalance = totalTaken - totalGiven;

      return {
        id: m.id,
        name: m.name,
        surname: m.surname,
        phone: m.phone,
        village: m.village,
        suretyName: m.suretyName,
        suretyPhone: m.suretyPhone,
        nomineeName: m.nomineeName,
        nomineePhone: m.nomineePhone,
        nomineeRelation: m.nomineeRelation,
        photo: m.photo,
        createdAt: m.createdAt.toISOString(),
        activeCount: activeChits.length,
        completedCount: completedChits.length,
        totalDue,
        totalTaken,
        totalGiven,
        netLedgerBalance,
        transactionsCount: m.transactions.length,
        chits: m.chits,
      };
    });

    if (searchQuery && searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.surname.toLowerCase().includes(q) ||
          m.village.toLowerCase().includes(q) ||
          m.phone.includes(q) ||
          (m.suretyName && m.suretyName.toLowerCase().includes(q)) ||
          (m.nomineeName && m.nomineeName.toLowerCase().includes(q))
      );
    }

    return result;
  } catch (error) {
    console.error("Error fetching all members:", error);
    return [];
  }
}

export async function createChitForMember(data: {
  memberId: string;
  chitAmount: number;
  durationMonths: number;
  monthlyInstallment: number;
  startDate: string;
  previousDue?: number;
  notes?: string;
}) {
  try {
    const chit = await prisma.chit.create({
      data: {
        memberId: data.memberId,
        chitAmount: Number(data.chitAmount),
        durationMonths: Number(data.durationMonths),
        monthlyInstallment: Number(data.monthlyInstallment),
        startDate: new Date(data.startDate),
        status: "ACTIVE",
        monthsCompleted: 0,
        totalPaid: 0,
        previousDue: Number(data.previousDue || 0),
        notes: data.notes?.trim() || null,
      },
    });

    revalidatePath("/");
    return { success: true, chitId: chit.id };
  } catch (error: any) {
    console.error("Error creating chit for member:", error);
    return { success: false, error: error.message || "Failed to create chit" };
  }
}

export async function updateMemberOnly(data: {
  id: string;
  name: string;
  surname: string;
  phone: string;
  village: string;
  suretyName?: string;
  suretyPhone?: string;
  nomineeName?: string;
  nomineePhone?: string;
  nomineeRelation?: string;
  photo?: string;
}) {
  try {
    await prisma.chitMember.update({
      where: { id: data.id },
      data: {
        name: data.name.trim(),
        surname: data.surname.trim(),
        phone: data.phone.trim(),
        village: data.village.trim(),
        suretyName: data.suretyName?.trim() || null,
        suretyPhone: data.suretyPhone?.trim() || null,
        nomineeName: data.nomineeName?.trim() || null,
        nomineePhone: data.nomineePhone?.trim() || null,
        nomineeRelation: data.nomineeRelation?.trim() || null,
        ...(data.photo !== undefined ? { photo: data.photo } : {}),
      },
    });

    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating member:", error);
    return { success: false, error: error.message || "Failed to update member" };
  }
}

export async function deleteMember(id: string) {
  try {
    await prisma.chitMember.delete({
      where: { id },
    });
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting member:", error);
    return { success: false, error: error.message || "Failed to delete member" };
  }
}

export async function getExistingChits(searchQuery?: string) {
  try {
    const chits = await prisma.chit.findMany({
      where: {
        status: "ACTIVE",
      },
      include: {
        member: {
          include: {
            chits: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        },
        payments: {
          orderBy: { paymentDate: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    let result = chits.map((c) => {
      const activeCount = c.member.chits.filter((x) => x.status === "ACTIVE").length;
      const completedCount = c.member.chits.filter((x) => x.status === "COMPLETED").length;

      return {
        id: c.id,
        memberId: c.member.id,
        name: c.member.name,
        surname: c.member.surname,
        phone: c.member.phone,
        village: c.member.village,
        suretyName: c.member.suretyName,
        suretyPhone: c.member.suretyPhone,
        nomineeName: c.member.nomineeName,
        nomineePhone: c.member.nomineePhone,
        nomineeRelation: c.member.nomineeRelation,
        photo: c.member.photo,
        chitAmount: c.chitAmount,
        durationMonths: c.durationMonths,
        monthlyInstallment: c.monthlyInstallment,
        startDate: c.startDate.toISOString(),
        status: c.status,
        monthsCompleted: c.monthsCompleted,
        totalPaid: c.totalPaid,
        previousDue: c.previousDue,
        notes: c.notes,
        createdAt: c.createdAt.toISOString(),
        activeChitsCount: activeCount,
        completedChitsCount: completedCount,
        payments: c.payments.map((p) => ({
          id: p.id,
          amount: p.amount,
          paymentDate: p.paymentDate.toISOString(),
          paymentMode: p.paymentMode,
          monthNumber: p.monthNumber,
          notes: p.notes,
        })),
      };
    });

    if (searchQuery && searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.surname.toLowerCase().includes(q) ||
          c.village.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          (c.suretyName && c.suretyName.toLowerCase().includes(q)) ||
          (c.nomineeName && c.nomineeName.toLowerCase().includes(q))
      );
    }

    return result;
  } catch (error) {
    console.error("Error fetching active chits:", error);
    return [];
  }
}

export async function getCompletedChits() {
  try {
    const chits = await prisma.chit.findMany({
      where: {
        status: "COMPLETED",
      },
      include: {
        member: {
          include: {
            chits: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        },
        payments: {
          orderBy: { paymentDate: "desc" },
        },
      },
      orderBy: { completedDate: "desc" },
    });

    return chits.map((c) => {
      const activeCount = c.member.chits.filter((x) => x.status === "ACTIVE").length;
      const completedCount = c.member.chits.filter((x) => x.status === "COMPLETED").length;

      return {
        id: c.id,
        memberId: c.member.id,
        name: c.member.name,
        surname: c.member.surname,
        phone: c.member.phone,
        village: c.member.village,
        suretyName: c.member.suretyName,
        suretyPhone: c.member.suretyPhone,
        nomineeName: c.member.nomineeName,
        nomineePhone: c.member.nomineePhone,
        nomineeRelation: c.member.nomineeRelation,
        photo: c.member.photo,
        chitAmount: c.chitAmount,
        durationMonths: c.durationMonths,
        monthlyInstallment: c.monthlyInstallment,
        startDate: c.startDate.toISOString(),
        completedDate: c.completedDate?.toISOString() || null,
        status: c.status,
        monthsCompleted: c.monthsCompleted,
        totalPaid: c.totalPaid,
        previousDue: c.previousDue,
        notes: c.notes,
        activeChitsCount: activeCount,
        completedChitsCount: completedCount,
        payments: c.payments.map((p) => ({
          id: p.id,
          amount: p.amount,
          paymentDate: p.paymentDate.toISOString(),
          paymentMode: p.paymentMode,
          monthNumber: p.monthNumber,
          notes: p.notes,
        })),
      };
    });
  } catch (error) {
    console.error("Error fetching completed chits:", error);
    return [];
  }
}

export async function recordPayment(data: {
  chitId: string;
  amount: number;
  paymentDate: string;
  paymentMode: string;
  monthNumber?: number;
  notes?: string;
}) {
  try {
    const chit = await prisma.chit.findUnique({
      where: { id: data.chitId },
      include: { payments: true },
    });

    if (!chit) throw new Error("Chit not found");

    const monthNum = data.monthNumber || chit.payments.length + 1;
    const paidAmount = Number(data.amount);

    await prisma.payment.create({
      data: {
        chitId: data.chitId,
        amount: paidAmount,
        paymentDate: new Date(data.paymentDate),
        paymentMode: data.paymentMode || "CASH",
        monthNumber: monthNum,
        notes: data.notes || null,
      },
    });

    const newTotalPaid = chit.totalPaid + paidAmount;
    const newMonthsCompleted = Math.min(chit.durationMonths, chit.monthsCompleted + 1);

    // If there was previous due, deduct payment amount that was paid towards it
    let newPreviousDue = chit.previousDue;
    if (newPreviousDue > 0) {
      const extraPaid = Math.max(0, paidAmount - chit.monthlyInstallment);
      newPreviousDue = Math.max(0, newPreviousDue - extraPaid);
    }

    await prisma.chit.update({
      where: { id: data.chitId },
      data: {
        totalPaid: newTotalPaid,
        monthsCompleted: newMonthsCompleted,
        previousDue: newPreviousDue,
      },
    });

    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Error recording payment:", error);
    return { success: false, error: error.message };
  }
}

export async function updateChitAndMember(data: {
  chitId: string;
  memberId: string;
  name: string;
  surname: string;
  phone: string;
  village: string;
  suretyName?: string;
  suretyPhone?: string;
  nomineeName?: string;
  nomineePhone?: string;
  nomineeRelation?: string;
  photo?: string;
  chitAmount: number;
  durationMonths: number;
  monthlyInstallment: number;
  startDate: string;
  previousDue: number;
  notes?: string;
}) {
  try {
    // Update Member
    await prisma.chitMember.update({
      where: { id: data.memberId },
      data: {
        name: data.name.trim(),
        surname: data.surname.trim(),
        phone: data.phone.trim(),
        village: data.village.trim(),
        suretyName: data.suretyName?.trim() || null,
        suretyPhone: data.suretyPhone?.trim() || null,
        nomineeName: data.nomineeName?.trim() || null,
        nomineePhone: data.nomineePhone?.trim() || null,
        nomineeRelation: data.nomineeRelation?.trim() || null,
        ...(data.photo !== undefined ? { photo: data.photo } : {}),
      },
    });

    // Update Chit
    await prisma.chit.update({
      where: { id: data.chitId },
      data: {
        chitAmount: Number(data.chitAmount),
        durationMonths: Number(data.durationMonths),
        monthlyInstallment: Number(data.monthlyInstallment),
        startDate: new Date(data.startDate),
        previousDue: Number(data.previousDue || 0),
        notes: data.notes?.trim() || null,
      },
    });

    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Error updating chit member:", error);
    return { success: false, error: error.message };
  }
}

export async function markChitCompleted(chitId: string) {
  try {
    await prisma.chit.update({
      where: { id: chitId },
      data: {
        status: "COMPLETED",
        completedDate: new Date(),
      },
    });
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Error marking chit completed:", error);
    return { success: false, error: error.message };
  }
}

export async function reopenChit(chitId: string) {
  try {
    await prisma.chit.update({
      where: { id: chitId },
      data: {
        status: "ACTIVE",
        completedDate: null,
      },
    });
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Error reopening chit:", error);
    return { success: false, error: error.message };
  }
}

export async function deleteChit(chitId: string) {
  try {
    await prisma.chit.delete({
      where: { id: chitId },
    });
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting chit:", error);
    return { success: false, error: error.message };
  }
}

// ================= MEMBER FINANCIAL LEDGER / TRANSACTIONS =================

export async function getMemberTransactions(memberId: string) {
  try {
    const member = await prisma.chitMember.findUnique({
      where: { id: memberId },
    });
    if (!member) {
      throw new Error("Member not found");
    }

    const transactions = await prisma.memberTransaction.findMany({
      where: { memberId },
      orderBy: { date: "desc" },
    });

    const totalTaken = transactions
      .filter((t) => t.type === "TAKEN")
      .reduce((sum, t) => sum + t.amount, 0);

    const totalGiven = transactions
      .filter((t) => t.type === "GIVEN")
      .reduce((sum, t) => sum + t.amount, 0);

    const netBalance = totalTaken - totalGiven;

    return {
      member: {
        id: member.id,
        name: member.name,
        surname: member.surname,
        phone: member.phone,
        village: member.village,
        photo: member.photo,
      },
      totalTaken,
      totalGiven,
      netBalance,
      transactions: transactions.map((t) => ({
        id: t.id,
        type: t.type,
        amount: t.amount,
        date: t.date.toISOString(),
        description: t.description,
        paymentMode: t.paymentMode,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
      })),
    };
  } catch (error: any) {
    console.error("Error getting member transactions:", error);
    throw error;
  }
}

export async function addMemberTransaction(data: {
  memberId: string;
  type: "TAKEN" | "GIVEN";
  amount: number;
  date: string;
  description: string;
  paymentMode: string;
}) {
  try {
    const tx = await prisma.memberTransaction.create({
      data: {
        memberId: data.memberId,
        type: data.type,
        amount: Number(data.amount),
        date: new Date(data.date),
        description: data.description.trim(),
        paymentMode: data.paymentMode || "CASH",
      },
    });

    revalidatePath("/");
    return { success: true, transaction: tx };
  } catch (error: any) {
    console.error("Error adding member transaction:", error);
    return { success: false, error: error.message || "Failed to add transaction" };
  }
}

export async function updateMemberTransaction(data: {
  id: string;
  type: "TAKEN" | "GIVEN";
  amount: number;
  date: string;
  description: string;
  paymentMode: string;
}) {
  try {
    const tx = await prisma.memberTransaction.update({
      where: { id: data.id },
      data: {
        type: data.type,
        amount: Number(data.amount),
        date: new Date(data.date),
        description: data.description.trim(),
        paymentMode: data.paymentMode || "CASH",
      },
    });

    revalidatePath("/");
    return { success: true, transaction: tx };
  } catch (error: any) {
    console.error("Error updating member transaction:", error);
    return { success: false, error: error.message || "Failed to update transaction" };
  }
}

export async function deleteMemberTransaction(id: string) {
  try {
    await prisma.memberTransaction.delete({
      where: { id },
    });

    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Error deleting member transaction:", error);
    return { success: false, error: error.message || "Failed to delete transaction" };
  }
}

// ================= WHATSAPP LINK & CONNECTION ACTIONS =================

export async function getWhatsAppConnectionAction() {
  try {
    return await getWhatsAppStatus();
  } catch (error: any) {
    return {
      status: "DISCONNECTED" as const,
      qrCodeDataUrl: null,
      userPhone: null,
      userName: null,
      lastError: error.message || "Failed to check WhatsApp status",
      lastConnectedAt: null,
    };
  }
}

export async function initWhatsAppConnectionAction(forceNew = false) {
  try {
    return await initWhatsAppClient(forceNew);
  } catch (error: any) {
    return {
      status: "DISCONNECTED" as const,
      qrCodeDataUrl: null,
      userPhone: null,
      userName: null,
      lastError: error.message || "Failed to initialize WhatsApp",
      lastConnectedAt: null,
    };
  }
}

export async function disconnectWhatsAppAction() {
  try {
    return await disconnectWhatsApp();
  } catch (error: any) {
    return {
      status: "DISCONNECTED" as const,
      qrCodeDataUrl: null,
      userPhone: null,
      userName: null,
      lastError: error.message || "Failed to disconnect WhatsApp",
      lastConnectedAt: null,
    };
  }
}

// ================= 1-CLICK WHOLE CHIT BROADCAST =================

export async function sendOneClickBroadcast(data: {
  chitAmount: number;
  schemeName: string;
  message: string;
  startDate?: string;
  channel?: string;
  smsApiKey?: string;
}) {
  try {
    let dateFilter = {};
    if (data.startDate) {
      const d = new Date(data.startDate);
      const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
      dateFilter = {
        startDate: {
          gte: startOfDay,
          lte: endOfDay,
        },
      };
    }

    // 1. Fetch all active chits for this scheme amount and date
    const chits = await prisma.chit.findMany({
      where: {
        status: "ACTIVE",
        ...(data.chitAmount > 0 ? { chitAmount: data.chitAmount } : {}),
        ...dateFilter,
      },
      include: {
        member: true,
      },
    });

    // Extract unique recipients (a member might have multiple active chits, only message once)
    const recipientMap = new Map<
      string,
      {
        id: string;
        name: string;
        surname: string;
        phone: string;
        village: string;
        chitAmount: number;
        monthlyInstallment: number;
        previousDue: number;
      }
    >();

    for (const c of chits) {
      if (!recipientMap.has(c.member.phone)) {
        recipientMap.set(c.member.phone, {
          id: c.member.id,
          name: c.member.name,
          surname: c.member.surname,
          phone: c.member.phone,
          village: c.member.village,
          chitAmount: c.chitAmount,
          monthlyInstallment: c.monthlyInstallment,
          previousDue: c.previousDue,
        });
      }
    }

    const recipients = Array.from(recipientMap.values());
    if (recipients.length === 0) {
      return {
        success: false,
        error: `No active members found in ${data.schemeName}.`,
      };
    }

    // Helper to personalize message for each member
    const resolveMessageForRecipient = (r: (typeof recipients)[0]) => {
      const totalPayable = (r.monthlyInstallment || 0) + (r.previousDue || 0);
      return data.message
        .replace(/\{Name\}/g, r.name)
        .replace(/\{Surname\}/g, r.surname)
        .replace(/\{Phone\}/g, r.phone)
        .replace(/\{Village\}/g, r.village)
        .replace(/\{ChitAmount\}/g, formatINR(r.chitAmount))
        .replace(/\{MonthlyInstallment\}/g, formatINR(r.monthlyInstallment))
        .replace(/\{PreviousDue\}/g, formatINR(r.previousDue || 0))
        .replace(/\{TotalPayable\}/g, formatINR(totalPayable))
        .replace(/\{TodayDate\}/g, formatDate(new Date()));
    };

    // Check WhatsApp status
    const waStatus = await getWhatsAppStatus();
    const apiKey = data.smsApiKey || process.env.FAST2SMS_API_KEY;

    let deliveryChannel = "UNLINKED";
    let sentCount = 0;
    let failedCount = 0;
    let deliveryResults: Array<{
      id: string;
      name: string;
      phone: string;
      success: boolean;
      error?: string;
    }> = [];

    // Path A: DIRECT 1-CLICK WHATSAPP BROADCAST (When WhatsApp is linked)
    if (waStatus.status === "CONNECTED") {
      deliveryChannel = "WHATSAPP_DIRECT";
      const waDispatch = await broadcastToChitRecipients(
        recipients.map((r) => ({
          id: r.id,
          name: r.name,
          surname: r.surname,
          phone: r.phone,
          message: resolveMessageForRecipient(r),
        }))
      );

      sentCount = waDispatch.successful;
      failedCount = waDispatch.failed;
      deliveryResults = waDispatch.results;
    }
    // Path B: Optional Fast2SMS Fallback
    else if (apiKey) {
      deliveryChannel = "FAST2SMS_GATEWAY";
      const numbers = recipients
        .map((r) => r.phone.replace(/\D/g, ""))
        .filter((p) => p.length >= 10)
        .join(",");

      if (numbers) {
        try {
          const resp = await fetch("https://www.fast2sms.com/dev/bulkV2", {
            method: "POST",
            headers: {
              authorization: apiKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              route: "v3",
              sender_id: "TXTIND",
              message: data.message,
              language: "english",
              numbers: numbers,
            }),
          });
          const json = await resp.json();
          if (json.return) {
            sentCount = recipients.length;
            deliveryResults = recipients.map((r) => ({
              id: r.id,
              name: `${r.name} ${r.surname}`,
              phone: r.phone,
              success: true,
            }));
          } else {
            failedCount = recipients.length;
          }
        } catch (gatewayErr: any) {
          console.error("Fast2SMS gateway error:", gatewayErr);
          failedCount = recipients.length;
        }
      }
    }
    // Path C: WhatsApp is not linked yet
    else {
      return {
        success: false,
        notLinked: true,
        recipientCount: recipients.length,
        recipients,
        error:
          "WhatsApp is not linked yet. Please scan the QR code to link your WhatsApp for instant 1-click broadcast, or use the WhatsApp Group button below.",
      };
    }

    // Record audit in database
    const log = await prisma.broadcastLog.create({
      data: {
        chitScheme: data.schemeName,
        chitAmount: data.chitAmount,
        recipientCount: recipients.length,
        recipients: JSON.stringify(deliveryResults),
        message: data.message,
        status: failedCount === 0 ? "DELIVERED" : sentCount > 0 ? "PARTIAL" : "FAILED",
        channel: deliveryChannel,
      },
    });

    revalidatePath("/");

    return {
      success: sentCount > 0,
      channel: deliveryChannel,
      recipientCount: recipients.length,
      sentCount,
      failedCount,
      results: deliveryResults,
      broadcastId: log.id,
      timestamp: log.createdAt.toISOString(),
    };
  } catch (error: any) {
    console.error("Error executing 1-click broadcast:", error);
    return {
      success: false,
      error: error.message || "Failed to send 1-click broadcast",
    };
  }
}

export async function getBroadcastHistory() {
  try {
    const logs = await prisma.broadcastLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
    });

    return logs.map((log) => ({
      id: log.id,
      chitScheme: log.chitScheme,
      chitAmount: log.chitAmount,
      recipientCount: log.recipientCount,
      recipients: JSON.parse(log.recipients || "[]"),
      message: log.message,
      status: log.status,
      channel: log.channel,
      createdAt: log.createdAt.toISOString(),
    }));
  } catch (error) {
    console.error("Error fetching broadcast history:", error);
    return [];
  }
}

// ================= AUTHENTICATION ACTIONS =================

const AUTH_COOKIE_NAME = "hanumanth_chits_session";

export async function loginUserAction(credentials: {
  username: string;
  password: string;
  rememberMe?: boolean;
}) {
  try {
    const u = credentials.username.trim().toLowerCase();
    const p = credentials.password.trim();

    // Valid logins for father/owner & admin:
    // Username: "admin" or "hanumath" or "hanumanth" or "srikanth"
    // Password: "admin" or "admin123" or "hanumath" or "hanumath123" or "123456"
    const isUsernameValid =
      u === "admin" ||
      u === "hanumath" ||
      u === "hanumanth" ||
      u === "srikanth" ||
      u === "owner";

    const isPasswordValid =
      p === "admin" ||
      p === "admin123" ||
      p === "hanumath" ||
      p === "hanumath123" ||
      p === "hanumanth" ||
      p === "hanumanth123" ||
      p === "srikanth" ||
      p === "srikanth123" ||
      p === "123456";

    if (!isUsernameValid || !isPasswordValid) {
      return {
        success: false,
        error: "Incorrect username or password. Please check your credentials.",
      };
    }

    const displayName =
      u === "admin" || u === "hanumanth" || u === "hanumath" || u === "owner"
        ? "Hanumanth (Owner)"
        : "Srikanth";

    const cookieStore = await cookies();
    const maxAge = credentials.rememberMe !== false ? 60 * 60 * 24 * 30 : 60 * 60 * 24; // 30 days or 1 day

    cookieStore.set(
      AUTH_COOKIE_NAME,
      JSON.stringify({
        username: u,
        displayName,
        loggedInAt: Date.now(),
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge,
      }
    );

    return {
      success: true,
      username: displayName,
    };
  } catch (error: any) {
    console.error("Login action error:", error);
    return {
      success: false,
      error: error.message || "Authentication failed",
    };
  }
}

export async function checkAuthStatusAction() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(AUTH_COOKIE_NAME);
    if (!sessionCookie?.value) {
      return { authenticated: false, username: null };
    }

    const data = JSON.parse(sessionCookie.value);
    return {
      authenticated: true,
      username: data.displayName || "Hanumanth (Owner)",
    };
  } catch {
    return { authenticated: false, username: null };
  }
}

export async function logoutUserAction() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(AUTH_COOKIE_NAME);
    return { success: true };
  } catch {
    return { success: false };
  }
}

// ================= FINANCE OPERATIONS (KHATABOOK) =================

export async function getFinanceSummaryAction() {
  try {
    const customers = await prisma.financeCustomer.findMany({
      include: {
        entries: true,
      },
    });

    let totalGave = 0;
    let totalGot = 0;
    let customersWithDue = 0;

    customers.forEach((c) => {
      let custGave = 0;
      let custGot = 0;
      c.entries.forEach((e) => {
        if (e.type === "GAVE") custGave += e.amount;
        if (e.type === "GOT") custGot += e.amount;
      });
      totalGave += custGave;
      totalGot += custGot;
      if (custGave - custGot > 0) {
        customersWithDue++;
      }
    });

    const netMarketDue = totalGave - totalGot;

    return {
      success: true,
      totalGave,
      totalGot,
      netMarketDue,
      totalCustomers: customers.length,
      customersWithDue,
    };
  } catch (error: any) {
    console.error("Error in getFinanceSummaryAction:", error);
    return {
      success: false,
      error: error.message || "Failed to load finance summary",
      totalGave: 0,
      totalGot: 0,
      netMarketDue: 0,
      totalCustomers: 0,
      customersWithDue: 0,
    };
  }
}

export async function getFinanceCustomersAction(
  filter: "ALL" | "DUE" | "SETTLED" | "GIVE" = "ALL",
  search?: string
) {
  try {
    const customers = await prisma.financeCustomer.findMany({
      include: {
        entries: {
          orderBy: { date: "desc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    let list = customers.map((c) => {
      let totalGave = 0;
      let totalGot = 0;
      c.entries.forEach((e) => {
        if (e.type === "GAVE") totalGave += e.amount;
        if (e.type === "GOT") totalGot += e.amount;
      });
      const netBalance = totalGave - totalGot;
      const lastEntry = c.entries.length > 0 ? c.entries[0] : null;

      let status: "DUE" | "SETTLED" | "GIVE" = "SETTLED";
      if (netBalance > 0) status = "DUE"; // Market owes us
      else if (netBalance < 0) status = "GIVE"; // We owe market (excess payment / advance)

      return {
        id: c.id,
        name: c.name,
        surname: c.surname || "",
        phone: c.phone,
        village: c.village || "",
        notes: c.notes || "",
        memberId: c.memberId || null,
        totalGave,
        totalGot,
        netBalance,
        status,
        entryCount: c.entries.length,
        lastEntryDate: lastEntry ? lastEntry.date.toISOString() : null,
        lastEntryType: lastEntry ? lastEntry.type : null,
        lastEntryAmount: lastEntry ? lastEntry.amount : null,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      };
    });

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.surname.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.village.toLowerCase().includes(q)
      );
    }

    if (filter === "DUE") {
      list = list.filter((c) => c.status === "DUE");
    } else if (filter === "SETTLED") {
      list = list.filter((c) => c.status === "SETTLED");
    } else if (filter === "GIVE") {
      list = list.filter((c) => c.status === "GIVE");
    }

    return { success: true, customers: list };
  } catch (error: any) {
    console.error("Error in getFinanceCustomersAction:", error);
    return { success: false, error: error.message || "Failed to load customers", customers: [] };
  }
}

export async function createFinanceCustomerAction(data: {
  name: string;
  surname?: string;
  phone: string;
  village?: string;
  notes?: string;
  memberId?: string;
  openingBalanceType?: "GAVE" | "GOT";
  openingAmount?: number;
  openingDate?: string;
  openingDescription?: string;
  openingPaymentMode?: string;
  interestRate?: number;
}) {
  try {
    const customer = await prisma.financeCustomer.create({
      data: {
        name: data.name.trim(),
        surname: (data.surname || "").trim(),
        phone: data.phone.trim(),
        village: (data.village || "").trim(),
        notes: (data.notes || "").trim() || null,
        memberId: data.memberId || null,
      },
    });

    if (data.openingAmount && data.openingAmount > 0) {
      await prisma.financeEntry.create({
        data: {
          customerId: customer.id,
          type: data.openingBalanceType || "GAVE",
          amount: Number(data.openingAmount),
          date: data.openingDate ? new Date(data.openingDate) : new Date(),
          description: data.openingDescription?.trim() || "Opening Balance",
          paymentMode: data.openingPaymentMode || "CASH",
          interestRate: data.interestRate ? Number(data.interestRate) : null,
        },
      });
    }

    revalidatePath("/");
    return { success: true, customer };
  } catch (error: any) {
    console.error("Error in createFinanceCustomerAction:", error);
    return { success: false, error: error.message || "Failed to create finance customer" };
  }
}

export async function updateFinanceCustomerAction(
  id: string,
  data: {
    name: string;
    surname?: string;
    phone: string;
    village?: string;
    notes?: string;
  }
) {
  try {
    const customer = await prisma.financeCustomer.update({
      where: { id },
      data: {
        name: data.name.trim(),
        surname: (data.surname || "").trim(),
        phone: data.phone.trim(),
        village: (data.village || "").trim(),
        notes: (data.notes || "").trim() || null,
      },
    });

    revalidatePath("/");
    return { success: true, customer };
  } catch (error: any) {
    console.error("Error in updateFinanceCustomerAction:", error);
    return { success: false, error: error.message || "Failed to update customer" };
  }
}

export async function deleteFinanceCustomerAction(id: string) {
  try {
    await prisma.financeCustomer.delete({
      where: { id },
    });
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Error in deleteFinanceCustomerAction:", error);
    return { success: false, error: error.message || "Failed to delete customer" };
  }
}

export async function getCustomerLedgerAction(customerId: string) {
  try {
    const customer = await prisma.financeCustomer.findUnique({
      where: { id: customerId },
      include: {
        entries: {
          orderBy: { date: "asc" },
        },
      },
    });

    if (!customer) {
      return { success: false, error: "Customer not found" };
    }

    let runningBalance = 0;
    let totalGave = 0;
    let totalGot = 0;

    const entriesWithBalance = customer.entries.map((e) => {
      if (e.type === "GAVE") {
        totalGave += e.amount;
        runningBalance += e.amount;
      } else {
        totalGot += e.amount;
        runningBalance -= e.amount;
      }

      return {
        id: e.id,
        customerId: e.customerId,
        type: e.type,
        amount: e.amount,
        date: e.date.toISOString(),
        description: e.description || "",
        paymentMode: e.paymentMode || "CASH",
        interestRate: e.interestRate ?? null,
        billImage: e.billImage || null,
        runningBalance,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
      };
    });

    return {
      success: true,
      customer: {
        id: customer.id,
        name: customer.name,
        surname: customer.surname || "",
        phone: customer.phone,
        village: customer.village || "",
        notes: customer.notes || "",
        memberId: customer.memberId || null,
      },
      totalGave,
      totalGot,
      netBalance: runningBalance,
      entries: entriesWithBalance.reverse(), // most recent on top for display
    };
  } catch (error: any) {
    console.error("Error in getCustomerLedgerAction:", error);
    return { success: false, error: error.message || "Failed to load customer ledger" };
  }
}

export async function addFinanceEntryAction(data: {
  customerId: string;
  type: "GAVE" | "GOT";
  amount: number;
  date: string;
  description?: string;
  paymentMode?: string;
  interestRate?: number;
  billImage?: string;
}) {
  try {
    const entry = await prisma.financeEntry.create({
      data: {
        customerId: data.customerId,
        type: data.type,
        amount: Number(data.amount),
        date: new Date(data.date),
        description: data.description?.trim() || null,
        paymentMode: data.paymentMode || "CASH",
        interestRate: data.interestRate ? Number(data.interestRate) : null,
        billImage: data.billImage || null,
      },
    });

    await prisma.financeCustomer.update({
      where: { id: data.customerId },
      data: { updatedAt: new Date() },
    });

    revalidatePath("/");
    return { success: true, entry };
  } catch (error: any) {
    console.error("Error in addFinanceEntryAction:", error);
    return { success: false, error: error.message || "Failed to add entry" };
  }
}

export async function updateFinanceEntryAction(
  id: string,
  data: {
    type: "GAVE" | "GOT";
    amount: number;
    date: string;
    description?: string;
    paymentMode?: string;
    interestRate?: number;
  }
) {
  try {
    const entry = await prisma.financeEntry.update({
      where: { id },
      data: {
        type: data.type,
        amount: Number(data.amount),
        date: new Date(data.date),
        description: data.description?.trim() || null,
        paymentMode: data.paymentMode || "CASH",
        interestRate: data.interestRate ? Number(data.interestRate) : null,
      },
    });

    await prisma.financeCustomer.update({
      where: { id: entry.customerId },
      data: { updatedAt: new Date() },
    });

    revalidatePath("/");
    return { success: true, entry };
  } catch (error: any) {
    console.error("Error in updateFinanceEntryAction:", error);
    return { success: false, error: error.message || "Failed to update entry" };
  }
}

export async function deleteFinanceEntryAction(id: string) {
  try {
    const entry = await prisma.financeEntry.delete({
      where: { id },
    });

    await prisma.financeCustomer.update({
      where: { id: entry.customerId },
      data: { updatedAt: new Date() },
    });

    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Error in deleteFinanceEntryAction:", error);
    return { success: false, error: error.message || "Failed to delete entry" };
  }
}

export async function sendFinanceWhatsAppStatementAction(customerId: string) {
  try {
    const res = await getCustomerLedgerAction(customerId);
    if (!res.success || !res.customer) {
      return { success: false, error: res.error || "Customer not found" };
    }

    const { customer, totalGave, totalGot, netBalance } = res;
    const cleanPhone = customer.phone.replace(/\D/g, "");
    const today = new Intl.DateTimeFormat("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }).format(new Date());

    let balanceText = "";
    if (netBalance > 0) {
      balanceText = `🔴 నికర బకాయి (You will pay): ${formatINR(netBalance)}`;
    } else if (netBalance < 0) {
      balanceText = `🟢 అడ్వాన్స్ నిల్వ (Excess Paid): ${formatINR(Math.abs(netBalance))}`;
    } else {
      balanceText = `✅ ఖాతా పూర్తిగా సరిపోయింది (Settled: ₹0)`;
    }

    const message = `*హనుమంత్ ఫైనాన్స్ & చీటీస్ (Hanumanth Finance)*
ఖాతా వివరాలు / Account Statement
------------------------------------------
👤 ఖాతాదారుడు: *${customer.name} ${customer.surname}*
📍 ఊరు: ${customer.village || "-"}
📅 తేదీ: ${today}

💰 మీరు తీసుకున్న మొత్తం (You Took / Gave): ${formatINR(totalGave)}
💵 మీరు చెల్లించిన మొత్తం (You Paid / Got): ${formatINR(totalGot)}
------------------------------------------
👉 *${balanceText}*
------------------------------------------
దయచేసి మీ ఖాతా సరిచూసుకోగలరు. ఏవైనా సందేహాలు ఉంటే సంప్రదించండి.

ధన్యవాదాలు!
- *హనుమంత్ (Hanumanth)*
📞 ఫోన్: 9177755333 / 8328312357`;

    // 1. Direct send via integrated WhatsApp Gateway
    let directSent = false;
    let gatewayError = null;
    try {
      const waRes = await sendDirectWhatsAppMessage(cleanPhone, message);
      if (waRes.success) {
        directSent = true;
      } else {
        gatewayError = waRes.error;
      }
    } catch (e: any) {
      gatewayError = e.message;
    }

    // 2. Generate web WhatsApp link fallback
    const encoded = encodeURIComponent(message);
    const webWhatsAppUrl = `https://wa.me/91${cleanPhone}?text=${encoded}`;

    return {
      success: true,
      directSent,
      gatewayError,
      message,
      webWhatsAppUrl,
      customerName: customer.name,
      phone: cleanPhone,
    };
  } catch (error: any) {
    console.error("Error in sendFinanceWhatsAppStatementAction:", error);
    return { success: false, error: error.message || "Failed to prepare statement" };
  }
}

// ================= CHIT MONTHLY AUCTIONS & TAKERS (నెలవారీ చీటీ ఎత్తుకున్నవారు) =================

export async function getChitMonthlyAuctions(chitSchemeKey: string) {
  try {
    const records = await prisma.chitMonthlyAuction.findMany({
      where: { chitSchemeKey },
      orderBy: { monthNumber: "asc" },
    });

    return {
      success: true,
      records: records.map((r) => ({
        id: r.id,
        chitSchemeKey: r.chitSchemeKey,
        chitAmount: r.chitAmount,
        startDate: r.startDate.toISOString(),
        monthNumber: r.monthNumber,
        monthDate: r.monthDate ? r.monthDate.toISOString() : null,
        takerName: r.takerName || "",
        takerMemberId: r.takerMemberId || null,
        bidAmount: r.bidAmount || 0,
        payoutAmount: r.payoutAmount || 0,
        paidDate: r.paidDate ? r.paidDate.toISOString() : null,
        notes: r.notes || "",
        updatedAt: r.updatedAt.toISOString(),
      })),
    };
  } catch (error: any) {
    console.error("Error fetching chit monthly auctions:", error);
    return { success: false, error: error.message || "Failed to fetch auctions", records: [] };
  }
}

export async function saveChitMonthlyAuction(data: {
  chitSchemeKey: string;
  chitAmount: number;
  startDate: string;
  monthNumber: number;
  monthDate?: string;
  takerName: string;
  takerMemberId?: string;
  bidAmount?: number;
  payoutAmount?: number;
  paidDate?: string;
  notes?: string;
}) {
  try {
    const cleanTakerName = data.takerName.trim();
    const cleanStartDate = new Date(data.startDate);
    const cleanMonthDate = data.monthDate
      ? new Date(data.monthDate)
      : new Date(
          cleanStartDate.getFullYear(),
          cleanStartDate.getMonth() + data.monthNumber - 1,
          cleanStartDate.getDate()
        );

    const record = await prisma.chitMonthlyAuction.upsert({
      where: {
        chitSchemeKey_monthNumber: {
          chitSchemeKey: data.chitSchemeKey,
          monthNumber: Number(data.monthNumber),
        },
      },
      create: {
        chitSchemeKey: data.chitSchemeKey,
        chitAmount: Number(data.chitAmount),
        startDate: cleanStartDate,
        monthNumber: Number(data.monthNumber),
        monthDate: cleanMonthDate,
        takerName: cleanTakerName,
        takerMemberId: data.takerMemberId || null,
        bidAmount: data.bidAmount ? Number(data.bidAmount) : null,
        payoutAmount: data.payoutAmount ? Number(data.payoutAmount) : null,
        paidDate: data.paidDate ? new Date(data.paidDate) : null,
        notes: data.notes?.trim() || null,
      },
      update: {
        takerName: cleanTakerName,
        takerMemberId: data.takerMemberId || null,
        bidAmount: data.bidAmount ? Number(data.bidAmount) : null,
        payoutAmount: data.payoutAmount ? Number(data.payoutAmount) : null,
        paidDate: data.paidDate ? new Date(data.paidDate) : null,
        notes: data.notes?.trim() || null,
        monthDate: cleanMonthDate,
      },
    });

    revalidatePath("/");
    return { success: true, record };
  } catch (error: any) {
    console.error("Error saving chit monthly auction:", error);
    return { success: false, error: error.message || "Failed to save monthly taker" };
  }
}

export async function clearChitMonthlyAuction(chitSchemeKey: string, monthNumber: number) {
  try {
    await prisma.chitMonthlyAuction.deleteMany({
      where: {
        chitSchemeKey,
        monthNumber: Number(monthNumber),
      },
    });

    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    console.error("Error clearing monthly auction:", error);
    return { success: false, error: error.message || "Failed to clear taker" };
  }
}

export async function sendChitTakerWhatsAppNoticeAction(data: {
  phone: string;
  takerName: string;
  monthNumber: number;
  chitAmount: number;
  payoutAmount?: number;
  date?: string;
}) {
  try {
    const cleanPhone = data.phone.replace(/\D/g, "");
    const today =
      data.date ||
      new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }).format(new Date());

    const message = `*హనుమంత్ చీటీస్ (Hanumanth Chits)*
చీటీ ఎత్తుకున్న వివరాలు / Chit Payout Confirmation
------------------------------------------
గౌరవనీయులైన: *${data.takerName}* గారు,
నమస్కారము!

మీరు *${formatINR(data.chitAmount)} చీటీ* లో *నెల ${data.monthNumber} (Month ${data.monthNumber})* చీటీని తీసుకున్నారు.

💰 చీటీ విలువ: ${formatINR(data.chitAmount)}
💵 మీకు చెల్లించే నికర మొత్తం (Payout): ${
      data.payoutAmount ? formatINR(data.payoutAmount) : formatINR(data.chitAmount)
    }
📅 తేదీ: ${today}
------------------------------------------
ఏవైనా సందేహాలు ఉంటే వెంటనే సంప్రదించగలరు.

ధన్యవాదాలు,
- *హనుమంత్ (Hanumanth)*
📞 9177755333 / 8328312357`;

    let directSent = false;
    let gatewayError = null;
    try {
      const waRes = await sendDirectWhatsAppMessage(cleanPhone, message);
      if (waRes.success) {
        directSent = true;
      } else {
        gatewayError = waRes.error;
      }
    } catch (e: any) {
      gatewayError = e.message;
    }

    const encoded = encodeURIComponent(message);
    const webWhatsAppUrl = `https://wa.me/91${cleanPhone}?text=${encoded}`;

    return {
      success: true,
      directSent,
      gatewayError,
      message,
      webWhatsAppUrl,
    };
  } catch (error: any) {
    console.error("Error sending chit taker notice:", error);
    return { success: false, error: error.message || "Failed to send notice" };
  }
}



